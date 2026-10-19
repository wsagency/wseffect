import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type CDPSession, type Page } from '@playwright/test'
import { preview } from 'vite'
import { SCENARIOS, type PerfScenario } from './scenarios.ts'

export { SCENARIOS }

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const BASELINE_PATH = join(ROOT, 'bench/baselines/perf.json')
const HOOK_BY_SCENARIO: Record<PerfScenario['id'], string> = {
  'vl-cell': 'vl-cell-input',
  'vl-filter': 'vl-filter',
  'vl-sort': 'vl-sort',
  'vl-select': 'vl-select',
  'form-field': 'form-field-0',
  'menus-tick': 'menus-tick',
}

const SESSIONS = 10
const SCRIPT_RATIO = 1.10
const EVENT_RATIO = 1.10
const EVENT_DELTA_MS = 8

interface EventEntry {
  readonly interactionId: number
  readonly duration: number
}

interface CdpClient {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>
}

export interface RegressionInput {
  readonly baseScript: readonly number[]
  readonly candScript: readonly number[]
  readonly baseEvent: readonly number[]
  readonly candEvent: readonly number[]
}

export interface NoiseBand {
  readonly p95AbsDeltaMs: number
  readonly minDeltaMs: number
  readonly maxDeltaMs: number
}

export interface RegressionResult extends RegressionInput {
  readonly script: NoiseBand
  readonly event: NoiseBand
  readonly regressed: boolean
}

export async function applyCpuThrottle(client: CdpClient): Promise<void> {
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })
}

export function interactionDuration(entries: readonly EventEntry[]): number {
  const longestByInteraction = new Map<number, number>()
  for (const { interactionId, duration } of entries) {
    if (interactionId <= 0) continue
    longestByInteraction.set(interactionId, Math.max(longestByInteraction.get(interactionId) ?? 16, duration, 16))
  }
  return longestByInteraction.size === 0 ? 16 : Math.max(...longestByInteraction.values())
}

function median(values: readonly number[]): number {
  if (values.length === 0) throw new Error('cannot compute a median of no samples')
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[middle]!
}

export function regressed(input: RegressionInput): boolean {
  const baseScript = median(input.baseScript)
  const candScript = median(input.candScript)
  const baseEvent = median(input.baseEvent)
  const candEvent = median(input.candEvent)
  return candScript > SCRIPT_RATIO * baseScript
    || (candEvent > EVENT_RATIO * baseEvent && candEvent - baseEvent >= EVENT_DELTA_MS)
}

export function noiseBand(baseline: readonly number[], candidate: readonly number[]): NoiseBand {
  if (baseline.length !== candidate.length || baseline.length === 0) {
    throw new Error('noise-band samples must be non-empty paired arrays of equal length')
  }
  const deltas = baseline.map((value, index) => candidate[index]! - value).sort((left, right) => left - right)
  const absoluteDeltas = deltas.map(Math.abs).sort((left, right) => left - right)
  return {
    p95AbsDeltaMs: absoluteDeltas[Math.ceil(0.95 * absoluteDeltas.length) - 1]!,
    minDeltaMs: deltas[0]!,
    maxDeltaMs: deltas[deltas.length - 1]!,
  }
}

async function scriptDuration(client: CDPSession): Promise<number> {
  const { metrics } = await client.send('Performance.getMetrics')
  const metric = metrics.find(({ name }) => name === 'ScriptDuration')
  if (metric === undefined) throw new Error('CDP Performance.getMetrics did not return ScriptDuration')
  return metric.value * 1_000
}

async function eventEntries(page: Page): Promise<EventEntry[]> {
  return page.evaluate(() => performance.getEntriesByType('event')
    .filter((entry) => 'interactionId' in entry && (entry as PerformanceEventTiming).interactionId > 0)
    .map((entry) => ({
      interactionId: (entry as PerformanceEventTiming).interactionId,
      duration: entry.duration,
    })))
}

export async function runScenario(
  baseUrl: string,
  scenario: PerfScenario,
  sessions = SESSIONS,
): Promise<{ eventMs: number[]; scriptMs: number[] }> {
  const browser = await chromium.launch()
  const eventMs: number[] = []
  const scriptMs: number[] = []
  try {
    for (let session = 0; session < sessions; session += 1) {
      const page = await browser.newPage()
      const client = await page.context().newCDPSession(page)
      try {
        await applyCpuThrottle(client)
        await client.send('Performance.enable')
        await page.addInitScript(() => {
          new PerformanceObserver(() => {}).observe({ type: 'event', durationThreshold: 16, buffered: true } as PerformanceObserverInit & { durationThreshold: number })
        })
        await page.goto(new URL(scenario.route, baseUrl).href, { waitUntil: 'networkidle' })
        await page.locator(`[data-perf="${HOOK_BY_SCENARIO[scenario.id]}"]`).waitFor({ state: 'visible' })
        const beforeScript = await scriptDuration(client)
        const entriesBefore = await eventEntries(page)
        await scenario.act(page)
        await page.waitForTimeout(100)
        const afterScript = await scriptDuration(client)
        const entriesAfter = await eventEntries(page)
        const priorInteractions = new Set(entriesBefore.map(({ interactionId }) => interactionId))
        const interactionEntries = entriesAfter.filter(({ interactionId }) => !priorInteractions.has(interactionId))
        eventMs.push(interactionDuration(interactionEntries))
        scriptMs.push(Math.max(0, afterScript - beforeScript))
      } finally {
        await client.detach()
        await page.close()
      }
    }
  } finally {
    await browser.close()
  }
  return { eventMs, scriptMs }
}

async function startPreview(appDir: string) {
  const server = await preview({ root: appDir, logLevel: 'error', preview: { host: '127.0.0.1', port: 0, strictPort: false } })
  const url = server.resolvedUrls?.local?.[0]
  if (url === undefined) {
    await server.close()
    throw new Error(`Vite preview did not expose a local URL for ${appDir}`)
  }
  return { server, url }
}

function parseArguments(args: readonly string[]): { appDir: string; selfTest: boolean } {
  let appDir = ''
  let selfTest = false
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!
    if (arg === '--app') {
      const value = args[++index]
      if (value === undefined) throw new Error('--app requires a directory')
      appDir = resolve(value)
    } else if (arg === '--self-test') {
      selfTest = true
    } else {
      throw new Error(`unknown argument: ${arg}`)
    }
  }
  if (appDir === '') throw new Error('usage: pnpm gate:perf --app <app-directory> [--self-test]')
  if (!statSync(appDir).isDirectory()) throw new Error(`app directory does not exist: ${appDir}`)
  return { appDir, selfTest }
}

async function runCli(): Promise<void> {
  const { appDir, selfTest } = parseArguments(process.argv.slice(2))
  execFileSync('pnpm', ['--dir', appDir, 'build'], { cwd: ROOT, stdio: 'inherit' })
  const candidate = await startPreview(appDir)
  if (selfTest) {
    try {
      const results = []
      for (const scenario of SCENARIOS) {
        const baselineEvent: number[] = []
        const candidateEvent: number[] = []
        const baselineScript: number[] = []
        const candidateScript: number[] = []
        for (let pair = 0; pair < SESSIONS; pair += 1) {
          const first = await runScenario(candidate.url, scenario, 1)
          const second = await runScenario(candidate.url, scenario, 1)
          const base = first
          const candidateResult = second
          baselineEvent.push(base.eventMs[0]!)
          candidateEvent.push(candidateResult.eventMs[0]!)
          baselineScript.push(base.scriptMs[0]!)
          candidateScript.push(candidateResult.scriptMs[0]!)
        }
        results.push({
          scenario: scenario.id,
          event: noiseBand(baselineEvent, candidateEvent),
          script: noiseBand(baselineScript, candidateScript),
        })
      }
      console.log(JSON.stringify({ mode: 'A/A diagnostic (not a gate)', sessions: SESSIONS, scenarios: results }, null, 2))
    } finally {
      await candidate.server.close()
    }
    return
  }

  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as { commit: string }
  const worktree = mkdtempSync(join(tmpdir(), 'wseffect-perf-'))
  try {
    execFileSync('git', ['worktree', 'add', '--detach', worktree, baseline.commit], { cwd: ROOT, stdio: 'inherit' })
    execFileSync('pnpm', ['install', '--frozen-lockfile'], { cwd: worktree, stdio: 'inherit' })
    const appRelative = relative(ROOT, appDir)
    const baselineAppDir = resolve(worktree, appRelative)
    execFileSync('pnpm', ['--dir', baselineAppDir, 'build'], { cwd: worktree, stdio: 'inherit' })
    const base = await startPreview(baselineAppDir)
    try {
      const reports = []
      let failed = false
      for (const scenario of SCENARIOS) {
        const baseEvent: number[] = []
        const candEvent: number[] = []
        const baseScript: number[] = []
        const candScript: number[] = []
        for (let pair = 0; pair < SESSIONS; pair += 1) {
          const baselineResult = await runScenario(base.url, scenario, 1)
          const candidateResult = await runScenario(candidate.url, scenario, 1)
          baseEvent.push(baselineResult.eventMs[0]!)
          candEvent.push(candidateResult.eventMs[0]!)
          baseScript.push(baselineResult.scriptMs[0]!)
          candScript.push(candidateResult.scriptMs[0]!)
        }
        const result: RegressionResult = {
          baseScript,
          candScript,
          baseEvent,
          candEvent,
          script: noiseBand(baseScript, candScript),
          event: noiseBand(baseEvent, candEvent),
          regressed: regressed({ baseScript, candScript, baseEvent, candEvent }),
        }
        const ceilingFailed = median(candEvent) > scenario.ceilingMs
        failed ||= result.regressed || ceilingFailed
        reports.push({ scenario: scenario.id, ceilingMs: scenario.ceilingMs, baseline: { eventMedianMs: median(baseEvent), scriptMedianMs: median(baseScript) }, candidate: { eventMedianMs: median(candEvent), scriptMedianMs: median(candScript) }, noise: { event: result.event, script: result.script }, regressed: result.regressed, ceilingFailed })
      }
      console.log(JSON.stringify({ baselineCommit: baseline.commit, candidateCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(), sessionsPerScenario: SESSIONS, scenarios: reports }, null, 2))
      if (failed) process.exitCode = 1
    } finally {
      await base.server.close()
    }
  } finally {
    await candidate.server.close()
    execFileSync('git', ['worktree', 'remove', '--force', worktree], { cwd: ROOT, stdio: 'inherit' })
    rmSync(worktree, { recursive: true, force: true })
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
