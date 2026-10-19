import { execFileSync } from 'node:child_process'
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { runScenario, SCENARIOS } from './perf.ts'
import type { PerfScenario } from './scenarios.ts'
import { measureSize, type SizeReport } from './size.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const WSEFFECT_APP = join(ROOT, 'tools/fixtures/mini-app')
const RADIX2SOLID_APP = join(ROOT, 'bench/radix2solid')
const DIFFERENCES = [
  'The wseffect side is a three-page Foldkit performance fixture; radix2solid includes additional component and theme demo routes, so shell and first-visit sizes reflect different application breadth.',
  'The matched menu and text-field hooks use native buttons and inputs in the fixture; radix2solid uses Radix2Solid DropdownMenu and TextField.Root components.',
  'Both virtual-list pages expose 15 visible rows with the same six child roles, but the fixture does not recycle rows while scrolling as the benchmark does.',
]

type ScenarioId = PerfScenario['id']
type ScenarioMetrics = { readonly eventMs: readonly number[]; readonly scriptMs: readonly number[] }

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

function formatMs(value: number): string {
  return String(Number(value.toFixed(1)))
}

function formatBytes(value: number): string {
  return `${new Intl.NumberFormat('en-US').format(value)} B`
}

export function renderSummary(report: ComparisonReport): string {
  const rows = [
    `| shell (Brotli-q11) | ${formatBytes(report.wseffect.size.shell)} | ${formatBytes(report.radix2solid.size.shell)} |`,
    `| first-visit (Brotli-q11) | ${formatBytes(report.wseffect.size.firstVisit.bytes)} | ${formatBytes(report.radix2solid.size.firstVisit.bytes)} |`,
  ]
  for (const scenario of SCENARIOS) {
    const id = scenario.id
    rows.push(`| ${id} Event Timing median (ms) | ${formatMs(median(report.wseffect.perf[id].eventMs))} | ${formatMs(median(report.radix2solid.perf[id].eventMs))} |`)
    rows.push(`| ${id} ScriptDuration median (ms) | ${formatMs(median(report.wseffect.perf[id].scriptMs))} | ${formatMs(median(report.radix2solid.perf[id].scriptMs))} |`)
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

async function applicationReport(appDir: string): Promise<ApplicationReport> {
  execFileSync('pnpm', ['--dir', appDir, 'build'], { cwd: ROOT, stdio: 'inherit' })
  const size = await measureSize({ distDir: join(appDir, 'dist'), pagesDir: join(appDir, 'src/pages') })
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
      perf[scenario.id] = await runScenario(baseUrl, scenario)
    }
    return { size, perf }
  } finally {
    await server.close()
  }
}

async function run(): Promise<void> {
  const report: ComparisonReport = {
    generatedAt: new Date().toISOString(),
    methodology: 'The six shared data-perf hooks use 10 sessions per app, 4× CPU throttling, Event Timing and CDP ScriptDuration from the same harness.',
    wseffect: await applicationReport(WSEFFECT_APP),
    radix2solid: await applicationReport(RADIX2SOLID_APP),
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
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
