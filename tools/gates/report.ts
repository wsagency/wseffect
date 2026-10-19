import { execFileSync } from 'node:child_process'
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser } from '@playwright/test'
import { preview } from 'vite'
import { runHarnessSelfTest, runScenario, SCENARIOS } from './perf.ts'
import type { PerfScenario } from './scenarios.ts'
import { primaryPages } from '../../apps/gallery/src/primaryPages.ts'
import { measureSize, type SizeReport } from './size.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const WSEFFECT_APP = join(ROOT, 'apps/gallery')
const RADIX2SOLID_APP = join(ROOT, 'bench/radix2solid')
const DIFFERENCES = [
  'The Gallery and radix2solid share the bench hooks; the Gallery exposes additional component and theme routes, so first-visit sizes reflect different application breadth.',
  'The matched menu and text-field hooks use native buttons and inputs in the Gallery; radix2solid uses Radix2Solid DropdownMenu and TextField.Root components.',
  'Both virtual-list pages expose 15 visible rows with the same six child roles; the benchmark also measures row recycling while scrolling.',
]

type ScenarioId = PerfScenario['id']
type ScenarioMetrics = {
  readonly eventMs: readonly number[]
  readonly eventEntryCounts: readonly (readonly number[])[]
  readonly scriptMs: readonly number[]
  readonly animationFrameCounts: readonly number[]
}

export interface ApplicationReport {
  readonly size: SizeReport
  readonly perf: Record<ScenarioId, ScenarioMetrics>
}

export interface ComparisonReport {
  readonly generatedAt?: string
  readonly methodology?: string
  readonly wseffect: ApplicationReport
  readonly radix2solid: ApplicationReport
  readonly differences: readonly string[]
}

function median(values: readonly number[]): number {
  if (values.length === 0) throw new Error('cannot compute a median of no performance samples')
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[middle]!
}
function medianEntryCount(samples: readonly (readonly number[])[]): number {
  const counts = samples.flatMap((interactionCounts) => interactionCounts.length === 0 ? [0] : interactionCounts)
  return counts.length === 0 ? 0 : median(counts)
}

function formatMs(value: number): string {
  return String(Number(value.toFixed(1)))
}

function formatBytes(value: number): string {
  return `${new Intl.NumberFormat('en-US').format(value)} B`
}

export function renderSummary(report: ComparisonReport): string {
  const rows = [
    `| shell (Brotli-q11) | ${formatBytes(report.wseffect.size.shell)} | ${formatBytes(report.radix2solid.size.shell)} |`,
    `| shell raw (entry + framework/vendor) | ${formatBytes(report.wseffect.size.shellRaw)} | ${formatBytes(report.radix2solid.size.shellRaw)} |`,
    `| first-visit (GATE-S2, Brotli-q11) | ${formatBytes(report.wseffect.size.firstVisit.bytes)} | ${formatBytes(report.radix2solid.size.firstVisit.bytes)} |`,
    `| speculative prefetch (GATE-S4, Brotli-q11) | ${formatBytes(report.wseffect.size.speculativePrefetch.bytes)} | ${formatBytes(report.radix2solid.size.speculativePrefetch.bytes)} |`,
  ]
  for (const scenario of SCENARIOS) {
    const id = scenario.id
    rows.push(`| ${id} Event Timing median (ms) | ${formatMs(median(report.wseffect.perf[id].eventMs))} | ${formatMs(median(report.radix2solid.perf[id].eventMs))} |`)
    rows.push(`| ${id} trace scripting median (ms) | ${formatMs(median(report.wseffect.perf[id].scriptMs))} | ${formatMs(median(report.radix2solid.perf[id].scriptMs))} |`)
    rows.push(`| ${id} qualified Event Timing entries (median/interaction) | ${formatMs(medianEntryCount(report.wseffect.perf[id].eventEntryCounts))} | ${formatMs(medianEntryCount(report.radix2solid.perf[id].eventEntryCounts))} |`)
    rows.push(`| ${id} trace rAF callbacks (median/interaction) | ${formatMs(median(report.wseffect.perf[id].animationFrameCounts))} | ${formatMs(median(report.radix2solid.perf[id].animationFrameCounts))} |`)
  }
  const differences = report.differences.map((difference) => `- ${difference}`).join('\n')
  return [
    'Reporting only; not a gate.',

    report.methodology ?? '',

    '| Measure | wseffect | radix2solid |',
    '| --- | ---: | ---: |',
    ...rows,
    '',
    '## Verified differences',
    differences || '- None observed.',
  ].join('\n')
}

async function applicationReport(appDir: string, browser: Browser, primaryPageKeys: ReadonlyArray<string>): Promise<ApplicationReport> {
  execFileSync('pnpm', ['--dir', appDir, 'build'], { cwd: ROOT, stdio: 'inherit' })
  const size = await measureSize({ distDir: join(appDir, 'dist'), pagesDir: join(appDir, 'src/pages'), primaryPageKeys })
  const server = await preview({
    root: appDir,
    logLevel: 'error',
    preview: { host: '127.0.0.1', port: 0, strictPort: false },
  })
  const baseUrl = server.resolvedUrls?.local?.[0]
  if (baseUrl === undefined) {
    await server.close()
    throw new Error(`Vite preview did not expose a local URL for ${appDir}`)
  }
  try {
    const perf = {} as Record<ScenarioId, ScenarioMetrics>
    for (const scenario of SCENARIOS) {
      const metrics = await runScenario(baseUrl, scenario, undefined, browser)
      perf[scenario.id] = metrics
    }
    return { size, perf }
  } finally {
    await server.close()
  }
}

async function run(): Promise<void> {
  await runHarnessSelfTest()
  const browser = await chromium.launch()
  try {
    const report: ComparisonReport = {
      generatedAt: new Date().toISOString(),
      methodology: 'Six matched data-perf hooks; 10 sessions per app; 4× CPU throttle verified by an in-page fixed loop; Event Timing captured by PerformanceObserver after paint and observer flush; scripting is the trace-event interval union from trusted click/keydown dispatch to the Event Timing next-paint boundary or following Paint/Commit. Shell reports the same index entry + framework/vendor pair as raw bytes and Brotli-q11 bytes.',
      wseffect: await applicationReport(WSEFFECT_APP, browser, primaryPages),
      radix2solid: await applicationReport(RADIX2SOLID_APP, browser, []),
      differences: DIFFERENCES,
    }
    const jsonPath = join(ROOT, '.artifacts/radix2solid-report.json')
    mkdirSync(dirname(jsonPath), { recursive: true })
    writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`)
    const summary = renderSummary(report)
    const summaryPath = process.env.GITHUB_STEP_SUMMARY
    if (summaryPath === undefined) console.log(summary)
    else appendFileSync(summaryPath, `${summary}\n`)
    console.log(`JSON report: ${jsonPath}`)
  } finally {
    await browser.close()
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
