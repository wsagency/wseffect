import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { hostname, loadavg, cpus } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser, type Page } from '@playwright/test'
import { preview } from 'vite'
import { measureSize, type SizeReport } from '../gates/size.ts'
import { runHarnessSelfTest, runScenario, SCENARIOS } from '../gates/perf.ts'
import type { PerfScenario } from '../gates/scenarios.ts'
import { primaryPages } from '../../apps/gallery/src/primaryPages.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const WSEFFECT_APP = join(ROOT, 'apps/gallery')
const RADIX2SOLID_APP = join(ROOT, 'bench/radix2solid')
const OUTPUT = join(ROOT, 'docs/benchmarks/data', `${new Date().toISOString().slice(0, 10)}-wseffect-vs-radix2solid-main.json`)
const RADIX_COMMIT = '383676172abb84b4a1d2e54a087d290437ee8848'
const RATES = [1, 4] as const
const BLOCKS = 5
const AA_PAIRS = 10
const APP_NAMES = ['wseffect', 'radix2solid'] as const

type AppName = typeof APP_NAMES[number]
type MetricName = 'eventTimingMs' | 'traceScriptingMs'
type Sample = { readonly eventTimingMs: number; readonly traceScriptingMs: number; readonly loadBefore: number[]; readonly loadAfter: number[] }

export function median(samples: readonly number[]): number {
  if (samples.length === 0) throw new Error('cannot compute median of no samples')
  const sorted = [...samples].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[middle]!
}

export function aaP95AbsDelta(samples: readonly number[]): number {
  if (samples.length < 2 || samples.length % 2 !== 0) throw new Error('A/A measurements must contain adjacent pairs')
  const deltas: number[] = []
  for (let index = 0; index < samples.length; index += 2) deltas.push(Math.abs(samples[index]! - samples[index + 1]!))
  deltas.sort((left, right) => left - right)
  return deltas[Math.ceil(deltas.length * 0.95) - 1]!
}

export type NoiseScreen = 'wseffect' | 'radix2solid' | '—'

export function noiseScreen(wseffectMedian: number, radixMedian: number, aaBand: number): NoiseScreen {
  const gap = Math.abs(wseffectMedian - radixMedian)
  if (gap <= aaBand) return '—'
  return wseffectMedian < radixMedian ? 'wseffect' : 'radix2solid'
}
export async function applySettingChange(page: Page, hook: string, buttonName: string): Promise<void> {
  const target = page.locator(`[data-perf="${hook}"]`)
  const isSelect = await target.evaluate((element) => element.tagName === 'SELECT')
  if (isSelect) await target.press('ArrowDown')
  else await target.getByRole('button', { name: buttonName }).press('Space')
}

async function resetThemeState(page: Page): Promise<void> {
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.reload({ waitUntil: 'networkidle' })
}

function customScenario(
  id: string,
  route: string,
  hook: string,
  act: (page: Parameters<PerfScenario['act']>[0]) => Promise<void>,
  reset: (page: Parameters<PerfScenario['reset']>[0]) => Promise<void>,
  inputEventType: 'click' | 'keydown' = 'click',
  warmup: (page: Parameters<PerfScenario['warmup']>[0]) => Promise<void> = act,
): PerfScenario {
  return {
    id, route, hook, inputEventType, ceilingMs: 50,
    prepare: async (page) => page.locator(`[data-perf="${hook}"]`).waitFor({ state: 'visible' }),
    warmup, reset, act,
  } as unknown as PerfScenario
}
export function readRadixFixtureCommit(metadataPath: string): string {
  const metadata: unknown = JSON.parse(readFileSync(metadataPath, 'utf8'))
  if (metadata === null || typeof metadata !== 'object' || !('commit' in metadata) || typeof metadata.commit !== 'string') {
    throw new Error(`radix fixture metadata has no commit string: ${metadataPath}`)
  }
  return metadata.commit
}

const EXTRA_SCENARIOS: readonly PerfScenario[] = [
  customScenario('theme-appearance', '/theme', 'theme-appearance', async (page) => applySettingChange(page, 'theme-appearance', 'Appearance'), resetThemeState, 'keydown'),
  customScenario('theme-accent', '/theme', 'theme-accent', async (page) => applySettingChange(page, 'theme-accent', 'Accent color'), resetThemeState, 'keydown'),
  customScenario('shared-date', '/shared', 'shared-date', async (page) => page.locator('[data-perf="shared-date"]').press('ArrowUp'), async (page) => page.locator('[data-perf="shared-date"]').fill('2026-01-01'), 'keydown'),
  customScenario('dialog-open', '/dialog', 'dialog-open', async (page) => page.getByRole('button', { name: 'Open dialog' }).click(), async (page) => page.getByRole('button', { name: 'Open dialog' }).click()),
  customScenario('dropdown-open', '/dropdown-menu', 'dropdown-open', async (page) => page.getByRole('button', { name: 'Actions' }).press('ArrowDown'), async (page) => page.getByRole('button', { name: 'Actions' }).press('Escape'), 'keydown'),
  customScenario('nav-cold', '/virtual-list', 'nav-cold', async (page) => page.locator('[data-perf="nav-cold"]').click(), async (page) => page.goto(new URL('/virtual-list', page.url()).href, { waitUntil: 'networkidle' }), 'click', async (page) => page.locator('main').waitFor({ state: 'visible' })),
  customScenario('nav-prefetch', '/virtual-list', 'nav-prefetch', async (page) => page.locator('[data-perf="nav-prefetch"]').click(), async (page) => page.goto(new URL('/virtual-list', page.url()).href, { waitUntil: 'networkidle' }), 'click', async (page) => { await page.locator('[data-perf="nav-prefetch"]').hover(); await page.waitForTimeout(500) }),
]
const ALL_SCENARIOS: readonly PerfScenario[] = [...SCENARIOS, ...EXTRA_SCENARIOS]

interface ServedApp {
  readonly server: { readonly resolvedUrls?: { readonly local?: readonly string[] }; close(): Promise<void> }
  readonly url: string
  readonly size: SizeReport
}

async function measureOne(browser: Browser, appUrl: string, scenario: PerfScenario, rate: number): Promise<Sample> {
  const loadBefore = loadavg()
  const sample = await runScenario(appUrl, scenario, 1, browser, rate)
  const loadAfter = loadavg()
  return {
    eventTimingMs: sample.eventMs[0]!,
    traceScriptingMs: sample.scriptMs[0]!,
    loadBefore,
    loadAfter,
  }
}

async function buildAndServe(appDir: string, appName: AppName): Promise<ServedApp> {
  execFileSync('pnpm', ['--dir', appDir, 'build'], { cwd: ROOT, stdio: 'inherit' })
  const size = await measureSize({ distDir: join(appDir, 'dist'), pagesDir: join(appDir, 'src/pages'), ...(appName === 'wseffect' ? { primaryPageKeys: primaryPages } : { primaryPageKeys: [] }) })
  const server = await preview({ root: appDir, logLevel: 'error', preview: { host: '127.0.0.1', port: 0, strictPort: false } })
  const url = server.resolvedUrls?.local?.[0]
  if (url === undefined) { await server.close(); throw new Error(`preview has no local URL for ${appName}`) }
  return { server, url, size }
}

type ScenarioData = {
  readonly sessionsPerApp: number
  readonly wseffect: { readonly samples: readonly Sample[]; readonly medians: Record<MetricName, number> }
  readonly radix2solid: { readonly samples: readonly Sample[]; readonly medians: Record<MetricName, number> }
  readonly aa: Record<AppName, Record<MetricName, { readonly samples: readonly number[]; readonly p95AbsDelta: number }>>
  readonly bands: Record<MetricName, number>
  readonly noiseScreen: Record<MetricName, NoiseScreen>
}

function summarizeSamples(samples: readonly Sample[]) {
  return {
    samples,
    medians: {
      eventTimingMs: median(samples.map((sample) => sample.eventTimingMs)),
      traceScriptingMs: median(samples.map((sample) => sample.traceScriptingMs)),
    },
  }
}

async function run(): Promise<void> {
  const startLoad = loadavg()
  const browserSelfTest = await runHarnessSelfTest()
  const browser = await chromium.launch()
  let wseffect: ServedApp | undefined
  let radix2solid: ServedApp | undefined
  try {
    wseffect = await buildAndServe(WSEFFECT_APP, 'wseffect')
    radix2solid = await buildAndServe(RADIX2SOLID_APP, 'radix2solid')
    const radixFixtureCommit = readRadixFixtureCommit(join(RADIX2SOLID_APP, 'library-source.json'))
    const report: Record<string, unknown> = {
      generatedAt: new Date().toISOString(),
      node: process.version,
      pnpm: execFileSync('pnpm', ['--version'], { cwd: ROOT, encoding: 'utf8' }).trim(),
      chromium: browser.version(),
      cpu: cpus()[0]?.model ?? 'unknown',
      hostname: hostname(),
      loadStart: startLoad,
      measuredCommit: execFileSync('git', ['rev-parse', 'origin/main'], { cwd: ROOT, encoding: 'utf8' }).trim(),
      radixFixtureCommit,
      throttleSelfTest: browserSelfTest,
      method: 'Five ABAB blocks: each block runs wseffect, radix2solid, wseffect, radix2solid (10 sessions per app/scenario/rate). A/A: 10 adjacent same-app pairs (20 sessions per app/scenario/rate), collected in alternating app order. Event Timing via PerformanceObserver; trace scripting via the shared CDP timeline runner. Each session includes before/after host load averages. Noise-screen band is max of the apps\' nearest-rank p95 adjacent-pair absolute deltas; winner only when absolute medians gap exceeds band.',
      scenarios: ALL_SCENARIOS.map(({ id, route, hook }) => ({ id, route, hook })),
      size: { wseffect: wseffect.size, radix2solid: radix2solid.size },
      results: {},
    }
    const allResults = report.results as Record<string, Record<string, ScenarioData>>
    for (const rate of RATES) {
      const rateResults: Record<string, ScenarioData> = {}
      allResults[`${rate}x`] = rateResults
      for (const scenario of ALL_SCENARIOS) {
        const abab: Record<AppName, Sample[]> = { wseffect: [], radix2solid: [] }
        for (let block = 0; block < BLOCKS; block += 1) {
          for (const appName of ['wseffect', 'radix2solid', 'wseffect', 'radix2solid'] as const) {
            const app = appName === 'wseffect' ? wseffect : radix2solid
            abab[appName].push(await measureOne(browser, app.url, scenario, rate))
          }
        }
        const aa: Record<AppName, Sample[]> = { wseffect: [], radix2solid: [] }
        for (let pair = 0; pair < AA_PAIRS; pair += 1) {
          const pairOrder = pair % 2 === 0 ? APP_NAMES : ['radix2solid', 'wseffect'] as const
          for (const appName of pairOrder) {
            const app = appName === 'wseffect' ? wseffect : radix2solid
            aa[appName].push(await measureOne(browser, app.url, scenario, rate))
            aa[appName].push(await measureOne(browser, app.url, scenario, rate))
          }
        }
        const aaStats = Object.fromEntries(APP_NAMES.map((appName) => [appName, Object.fromEntries((['eventTimingMs', 'traceScriptingMs'] as const).map((metric) => {
          const values = aa[appName].map((sample) => sample[metric])
          return [metric, { samples: values, p95AbsDelta: aaP95AbsDelta(values) }]
        }))])) as ScenarioData['aa']
        const bands = Object.fromEntries((['eventTimingMs', 'traceScriptingMs'] as const).map((metric) => [metric, Math.max(aaStats.wseffect[metric].p95AbsDelta, aaStats.radix2solid[metric].p95AbsDelta)])) as ScenarioData['bands']
        const w = summarizeSamples(abab.wseffect)
        const r = summarizeSamples(abab.radix2solid)
        rateResults[scenario.id] = {
          sessionsPerApp: BLOCKS * 2,
          wseffect: w,
          radix2solid: r,
          aa: aaStats,
          bands,
          noiseScreen: {
            eventTimingMs: noiseScreen(w.medians.eventTimingMs, r.medians.eventTimingMs, bands.eventTimingMs),
            traceScriptingMs: noiseScreen(w.medians.traceScriptingMs, r.medians.traceScriptingMs, bands.traceScriptingMs),
          },
        }
        console.log(`${rate}x ${scenario.id}: W ${w.medians.eventTimingMs}/${w.medians.traceScriptingMs} vs R ${r.medians.eventTimingMs}/${r.medians.traceScriptingMs}`)
      }
    }
    report.loadEnd = loadavg()
    mkdirSync(dirname(OUTPUT), { recursive: true })
    writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`)
    console.log(`Benchmark data written to ${OUTPUT}`)
  } finally {
    await wseffect?.server.close()
    await radix2solid?.server.close()
    await browser.close()
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
