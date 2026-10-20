import { mkdir, writeFile } from 'node:fs/promises'
import { cpus, loadavg } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser } from '@playwright/test'
import { preview } from 'vite'
import { runScenario, SCENARIOS } from './perf.ts'
import type { PerfScenario } from './scenarios.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SCRATCH = process.env.WSEFFECT_SCRATCH_DIR ?? join(process.env.HOME ?? '/tmp', '.cache/wseffect-scratch')
const OUTPUT = join(SCRATCH, 'menus-mount-abab.json')
const scenario = (config: Omit<PerfScenario, 'id'>): PerfScenario => ({ id: 'menus-tick', ...config })
const noOp = async () => {}
const scenarios: ReadonlyArray<Readonly<{ name: string; run: PerfScenario }>> = [
  {
    name: 'nav-cold',
    run: scenario({
      route: '/',
      hook: 'nav-cold',
      inputEventType: 'click',
      prepare: noOp,
      warmup: noOp,
      reset: noOp,
      act: async page => page.locator('[data-perf="nav-cold"]').click(),
      ceilingMs: 50,
    }),
  },
  {
    name: 'menus-tick',
    run: SCENARIOS.find(item => item.id === 'menus-tick')!,
  },
  {
    name: 'dropdown-open',
    run: scenario({
      route: '/dropdown-menu',
      hook: 'dropdown-open',
      inputEventType: 'click',
      prepare: noOp,
      warmup: async page => {
        await page.locator('[data-perf="dropdown-open"] button').click()
        await page.getByRole('menu').waitFor({ state: 'visible' })
      },
      reset: async page => {
        await page.keyboard.press('Escape')
        await page.getByRole('menu').waitFor({ state: 'hidden' })
      },
      act: async page => page.locator('[data-perf="dropdown-open"] button').click(),
      ceilingMs: 50,
    }),
  },
  {
    name: 'dialog-open',
    run: scenario({
      route: '/dialog',
      hook: 'dialog-open',
      inputEventType: 'click',
      prepare: noOp,
      warmup: async page => {
        await page.locator('[data-perf="dialog-open"] button').click()
        await page.getByRole('dialog').waitFor({ state: 'visible' })
      },
      reset: async page => {
        await page.getByRole('button', { name: 'Close' }).click()
        await page.getByRole('dialog').waitFor({ state: 'hidden' })
      },
      act: async page => page.locator('[data-perf="dialog-open"] button').click(),
      ceilingMs: 50,
    }),
  },
]

type Sample = Readonly<{
  eventTimingMs: number
  traceScriptingMs: number
  animationFrames: number
  loadBefore: readonly number[]
  loadAfter: readonly number[]
}>
const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = sorted.length >>> 1
  return sorted.length % 2 === 0 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[middle]!
}
const p95 = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.ceil(sorted.length * 0.95) - 1]!
}
const summarize = (values: readonly number[]) => ({ median: median(values), p95: p95(values), n: values.length })
const aaBand = (pairs: ReadonlyArray<readonly [number, number]>) => {
  const diffs = pairs.map(([left, right]) => Math.abs(left - right))
  return { p95AbsoluteDelta: p95(diffs), deltas: pairs.map(([left, right]) => right - left) }
}
const load = (): number[] => loadavg()

async function previewApp(appDir: string, port: number) {
  const server = await preview({
    root: appDir,
    logLevel: 'error',
    preview: { host: '127.0.0.1', port, strictPort: true },
  })
  const url = server.resolvedUrls?.local?.[0]
  if (url === undefined) {
    await server.close()
    throw new Error(`preview did not expose a local URL for ${appDir}`)
  }
  return { server, url }
}

async function sample(url: string, run: PerfScenario, browser: Browser, rate: number): Promise<Sample> {
  const loadBefore = load()
  const result = await runScenario(url, run, 1, browser, rate)
  const loadAfter = load()
  return {
    eventTimingMs: result.eventMs[0]!,
    traceScriptingMs: result.scriptMs[0]!,
    animationFrames: result.animationFrameCounts[0]!,
    loadBefore,
    loadAfter,
  }
}

async function measureComparison(
  baseline: Readonly<{ name: string; url: string }>,
  candidate: Readonly<{ name: string; url: string }>,
  browser: Browser,
) {
  const result: Record<string, unknown> = {}
  for (const rate of [1, 4]) {
    const rateResults: Record<string, unknown> = {}
    for (const item of scenarios) {
      const abab: Record<string, Sample[]> = { [baseline.name]: [], [candidate.name]: [] }
      const order: string[] = []
      for (let block = 0; block < 5; block += 1) {
        for (const side of [baseline, candidate, baseline, candidate]) {
          abab[side.name]!.push(await sample(side.url, item.run, browser, rate))
          order.push(side.name)
        }
      }
      const aa: Record<string, Sample[]> = { [baseline.name]: [], [candidate.name]: [] }
      for (const side of [baseline, candidate]) {
        for (let pair = 0; pair < 10; pair += 1) {
          aa[side.name]!.push(await sample(side.url, item.run, browser, rate))
          aa[side.name]!.push(await sample(side.url, item.run, browser, rate))
        }
      }
      const metricSummary = (samples: readonly Sample[]) => ({
        eventTimingMs: summarize(samples.map(value => value.eventTimingMs)),
        traceScriptingMs: summarize(samples.map(value => value.traceScriptingMs)),
      })
      const noiseSummary = (samples: readonly Sample[]) => ({
        eventTimingMs: aaBand(Array.from({ length: 10 }, (_, i) => [samples[i * 2]!.eventTimingMs, samples[i * 2 + 1]!.eventTimingMs] as const)),
        traceScriptingMs: aaBand(Array.from({ length: 10 }, (_, i) => [samples[i * 2]!.traceScriptingMs, samples[i * 2 + 1]!.traceScriptingMs] as const)),
      })
      const baselineStats = metricSummary(abab[baseline.name]!)
      const candidateStats = metricSummary(abab[candidate.name]!)
      const baselineNoise = noiseSummary(aa[baseline.name]!)
      const candidateNoise = noiseSummary(aa[candidate.name]!)
      const winner = (metric: 'eventTimingMs' | 'traceScriptingMs') => {
        const gap = Math.abs(baselineStats[metric].median - candidateStats[metric].median)
        const band = Math.max(baselineNoise[metric].p95AbsoluteDelta, candidateNoise[metric].p95AbsoluteDelta)
        return { winner: gap > band ? (candidateStats[metric].median < baselineStats[metric].median ? candidate.name : baseline.name) : 'noise', medianGap: gap, threshold: band }
      }
      console.log(JSON.stringify({
        comparison: `${baseline.name} vs ${candidate.name}`,
        rate: `${rate}x`,
        scenario: item.name,
        baseline: baselineStats,
        candidate: candidateStats,
        aaP95AbsDeltaMs: {
          eventTiming: [baselineNoise.eventTimingMs.p95AbsoluteDelta, candidateNoise.eventTimingMs.p95AbsoluteDelta],
          scripting: [baselineNoise.traceScriptingMs.p95AbsoluteDelta, candidateNoise.traceScriptingMs.p95AbsoluteDelta],
        },
        noiseScreen: { eventTiming: winner('eventTimingMs'), scripting: winner('traceScriptingMs') },
      }))
      rateResults[item.name] = {
        ababOrder: order,
        apps: {
          [baseline.name]: { abab: baselineStats, aaNoise: baselineNoise, samples: abab[baseline.name], aaSamples: aa[baseline.name] },
          [candidate.name]: { abab: candidateStats, aaNoise: candidateNoise, samples: abab[candidate.name], aaSamples: aa[candidate.name] },
        },
        noiseScreen: { eventTimingMs: winner('eventTimingMs'), traceScriptingMs: winner('traceScriptingMs') },
      }
    }
    result[`${rate}x`] = rateResults
  }
  return result
}

async function main() {
  const originRoot = process.env.WSEFFECT_ORIGIN_MAIN_DIR
  if (originRoot === undefined) throw new Error('WSEFFECT_ORIGIN_MAIN_DIR must point to the origin/main worktree')
  const startLoad = load()
  const [origin, branch, radix2solid] = await Promise.all([
    previewApp(join(originRoot, 'apps/gallery'), 4901),
    previewApp(join(ROOT, 'apps/gallery'), 4902),
    previewApp(join(ROOT, 'bench/radix2solid'), 4903),
  ])
  const browser = await chromium.launch()
  try {
    const comparisons = {
      'origin-main-vs-branch': await measureComparison(
        { name: 'origin/main', url: origin.url }, { name: 'branch', url: branch.url }, browser,
      ),
      'branch-vs-radix2solid': await measureComparison(
        { name: 'branch', url: branch.url }, { name: 'radix2solid', url: radix2solid.url }, browser,
      ),
    }
    const report = {
      generatedAt: new Date().toISOString(),
      node: process.version,
      pnpm: '11.5.0',
      chromium: browser.version(),
      cpu: process.env.WSEFFECT_PERF_CPU ?? cpus()[0]?.model ?? 'unknown CPU',
      method: 'Five ABAB blocks (10 sessions per app/scenario/rate) plus 10 adjacent A/A pairs per app/scenario/rate. Event Timing and scripting are collected through tools/gates/perf.ts. Before/after load averages are recorded for every interaction. Nav uses the gallery nav-cold hook; viewport/intent prefetch remains enabled, so the route chunk may be prefetched before the click.',
      loadStart: startLoad,
      loadEnd: load(),
      comparisons,
    }
    await mkdir(SCRATCH, { recursive: true })
    await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`)
    console.log(JSON.stringify({ output: OUTPUT, generatedAt: report.generatedAt, chromium: report.chromium, cpu: report.cpu, loadStart: report.loadStart, loadEnd: report.loadEnd }, null, 2))
  } finally {
    await browser.close()
    await Promise.all([origin.server.close(), branch.server.close(), radix2solid.server.close()])
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
