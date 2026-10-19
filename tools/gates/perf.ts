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
// Rounded-up paired p95 trace-noise floors, max across both local Node 26.8.2 A/A app runs.
const SCRIPT_NOISE_FLOOR_MS: Record<PerfScenario['id'], number> = {
  'vl-cell': 38,
  'vl-filter': 42,
  'vl-sort': 26,
  'vl-select': 20,
  'form-field': 26,
  'menus-tick': 29,
}
const EVENT_RATIO = 1.10
const EVENT_DELTA_MS = 8

interface EventEntry {
  readonly interactionId: number
  readonly duration: number
}

interface TraceEvent {
  readonly name?: string
  readonly ph?: string
  readonly ts?: number
  readonly dur?: number
  readonly args?: { readonly data?: { readonly type?: string } }
}

interface CdpClient {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>
}

interface SelfTestEventTiming {
  readonly handlerMs: number
  readonly eventMs: number
  readonly qualifiedEntries: number
}

interface SelfTestThrottle {
  readonly iterations: number
  readonly unthrottledMs: number
  readonly throttledMs: number
  readonly ratio: number
}

export interface HarnessSelfTestReport {
  readonly eventTiming: readonly SelfTestEventTiming[]
  readonly cpuThrottle: SelfTestThrottle
}

export interface RegressionInput {
  readonly baseScript: readonly number[]
  readonly candScript: readonly number[]
  readonly baseEvent: readonly number[]
  readonly candEvent: readonly number[]
  readonly scenarioId: PerfScenario['id']
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

function scriptRegressionThresholdMs(scenarioId: PerfScenario['id'], baseMedianMs: number): number {
  return Math.max((SCRIPT_RATIO - 1) * baseMedianMs, SCRIPT_NOISE_FLOOR_MS[scenarioId])
}

export function regressed(input: RegressionInput): boolean {
  const baseScript = median(input.baseScript)
  const candScript = median(input.candScript)
  const baseEvent = median(input.baseEvent)
  const candEvent = median(input.candEvent)
  return candScript - baseScript > scriptRegressionThresholdMs(input.scenarioId, baseScript)
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

const SCRIPT_TRACE_EVENTS = new Set([
  'EventDispatch',
  'EvaluateScript',
  'FunctionCall',
  'FireAnimationFrame',
  'FireIdleCallback',
  'FirePostMessage',
  'TimerFire',
  'RunMicrotasks',
  'ExecuteMicrotasks',
  'ScriptFirstStatement',
  'V8.Execute',
])

export function traceScriptingDuration(events: readonly TraceEvent[], inputEventType: PerfScenario['inputEventType'] = 'click'): number {
  const inputs = events
    .filter((event) => event.name === 'EventDispatch'
      && event.ph === 'X'
      && event.args?.data?.type === inputEventType
      && typeof event.ts === 'number')
    .sort((left, right) => left.ts! - right.ts!)
  if (inputs.length === 0) throw new Error(`trace did not contain a ${inputEventType} EventDispatch`)

  const presentations = events
    .filter((event) => (event.name === 'Paint' || event.name === 'Commit')
      && typeof event.ts === 'number')
    .sort((left, right) => left.ts! - right.ts!)
  const durations = inputs.map((input) => {
    const inputStart = input.ts!
    const presentationEnd = presentations.find((event) => event.ts! > inputStart)?.ts
    if (presentationEnd === undefined) throw new Error(`trace did not contain a Paint or Commit after ${inputEventType}`)

    const intervals = events
      .filter((event) => SCRIPT_TRACE_EVENTS.has(event.name ?? '')
        && event.ph === 'X'
        && typeof event.ts === 'number'
        && typeof event.dur === 'number'
        && event.dur > 0
        && event.ts < presentationEnd
        && event.ts + event.dur > inputStart)
      .map((event) => [Math.max(event.ts!, inputStart), Math.min(event.ts! + event.dur!, presentationEnd)] as const)
      .sort((left, right) => left[0] - right[0])

    let total = 0
    let intervalStart = 0
    let intervalEnd = 0
    for (const [start, end] of intervals) {
      if (start > intervalEnd) {
        total += intervalEnd - intervalStart
        intervalStart = start
        intervalEnd = end
      } else {
        intervalEnd = Math.max(intervalEnd, end)
      }
    }
    total += intervalEnd - intervalStart
    return total / 1_000
  })
  return Math.max(...durations)
}

async function installEventTimingObserver(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = window as Window & {
      __perfEventEntries?: EventEntry[]
      __perfEventObserver?: PerformanceObserver
    }
    target.__perfEventEntries = []
    target.__perfEventObserver?.disconnect()
    target.__perfEventObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const event = entry as PerformanceEventTiming & { interactionId: number }
        if (event.interactionId > 0) target.__perfEventEntries!.push({
          interactionId: event.interactionId,
          duration: event.duration,
        })
      }
    })
    target.__perfEventObserver.observe({
      type: 'event',
      durationThreshold: 16,
      buffered: true,
    } as PerformanceObserverInit & { durationThreshold: number })
  })
}

async function waitForPaintAndObserverFlush(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolveFlush) => {
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolveFlush, 0)))
  }))
}

async function eventEntries(page: Page): Promise<EventEntry[]> {
  await waitForPaintAndObserverFlush(page)
  return page.evaluate(() => (window as Window & { __perfEventEntries?: EventEntry[] }).__perfEventEntries ?? [])
}
function qualifiedEntryCounts(entries: readonly EventEntry[]): number[] {
  const countByInteraction = new Map<number, number>()
  for (const { interactionId } of entries) {
    if (interactionId <= 0) continue
    countByInteraction.set(interactionId, (countByInteraction.get(interactionId) ?? 0) + 1)
  }
  return [...countByInteraction.values()]
}

async function traceInteraction(client: CDPSession, page: Page, scenario: PerfScenario): Promise<number> {
  const events: TraceEvent[] = []
  const onData = ({ value }: { readonly value: TraceEvent[] }) => events.push(...value)
  client.on('Tracing.dataCollected', onData)
  await client.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline' })
  try {
    await scenario.act(page)
    await page.waitForTimeout(100)
  } finally {
    const complete = new Promise<void>((resolveComplete) => client.once('Tracing.tracingComplete', resolveComplete))
    await client.send('Tracing.end')
    await complete
    client.off('Tracing.dataCollected', onData)
  }
  return traceScriptingDuration(events, scenario.inputEventType)
}

export async function runScenario(
  baseUrl: string,
  scenario: PerfScenario,
  sessions = SESSIONS,
): Promise<{ eventMs: number[]; eventEntryCounts: number[][]; scriptMs: number[] }> {
  const browser = await chromium.launch()
  const eventMs: number[] = []
  const eventEntryCounts: number[][] = []
  const scriptMs: number[] = []
  try {
    for (let session = 0; session < sessions; session += 1) {
      const page = await browser.newPage()
      const client = await page.context().newCDPSession(page)
      try {
        await applyCpuThrottle(client)
        await page.goto(new URL(scenario.route, baseUrl).href, { waitUntil: 'networkidle' })
        await page.locator(`[data-perf="${HOOK_BY_SCENARIO[scenario.id]}"]`).waitFor({ state: 'visible' })
        await installEventTimingObserver(page)
        scriptMs.push(await traceInteraction(client, page, scenario))
        const entries = await eventEntries(page)
        eventMs.push(interactionDuration(entries))
        eventEntryCounts.push(qualifiedEntryCounts(entries))
      } finally {
        await client.detach()
        await page.close()
      }
    }
  } finally {
    await browser.close()
  }
  return { eventMs, eventEntryCounts, scriptMs }
}
export async function runHarnessSelfTest(): Promise<HarnessSelfTestReport> {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const client = await page.context().newCDPSession(page)
  try {
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    await page.setContent('<button id="slow">50 ms handler</button><button id="fast">5 ms handler</button>')
    await installEventTimingObserver(page)
    await page.evaluate(() => {
      const target = window as Window & { __selfTestTrusted?: boolean }
      const busyWait = (milliseconds: number, event: Event) => {
        target.__selfTestTrusted = event.isTrusted
        const deadline = performance.now() + milliseconds
        while (performance.now() < deadline) {
          // Intentional busy wait to exercise Event Timing.
        }
      }
      document.querySelector('#slow')!.addEventListener('click', (event) => busyWait(50, event))
      document.querySelector('#fast')!.addEventListener('click', (event) => busyWait(5, event))
    })

    const eventTiming: SelfTestEventTiming[] = []
    for (const handlerMs of [50, 5]) {
      await page.evaluate(() => { (window as Window & { __perfEventEntries?: EventEntry[] }).__perfEventEntries = [] })
      await page.locator(handlerMs === 50 ? '#slow' : '#fast').click()
      const entries = await eventEntries(page)
      const trusted = await page.evaluate(() => (window as Window & { __selfTestTrusted?: boolean }).__selfTestTrusted)
      if (trusted !== true) throw new Error('harness self-test click was not trusted browser input')
      const result = {
        handlerMs,
        eventMs: interactionDuration(entries),
        qualifiedEntries: entries.length,
      }
      eventTiming.push(result)
      if (handlerMs === 50 && (result.eventMs < 50 || result.qualifiedEntries === 0)) {
        throw new Error(`50 ms self-test click was not captured by Event Timing: ${JSON.stringify(result)}`)
      }
    }

    const iterations = 20_000_000
    const measureLoop = () => page.evaluate((count) => {
      const start = performance.now()
      let value = 0
      for (let index = 0; index < count; index += 1) value = (value + Math.imul(index, 2_654_435_761)) | 0
      ;(window as Window & { __loopSink?: number }).__loopSink = value
      return performance.now() - start
    }, iterations)
    await measureLoop()
    const unthrottledSamples = [await measureLoop(), await measureLoop(), await measureLoop()]
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    const throttledSamples = [await measureLoop(), await measureLoop(), await measureLoop()]
    const unthrottledMs = median(unthrottledSamples)
    const throttledMs = median(throttledSamples)
    const ratio = throttledMs / unthrottledMs
    if (ratio <= 2) throw new Error(`4× CPU throttle self-test ratio too low: ${ratio.toFixed(2)}×`)
    return {
      eventTiming,
      cpuThrottle: { iterations, unthrottledMs, throttledMs, ratio },
    }
  } finally {
    await client.detach()
    await browser.close()
  }
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
      const harnessSelfTest = await runHarnessSelfTest()
      const results = []
      for (const scenario of SCENARIOS) {
        const baselineEvent: number[] = []
        const candidateEvent: number[] = []
        const baselineEntries: number[][] = []
        const candidateEntries: number[][] = []
        const baselineScript: number[] = []
        const candidateScript: number[] = []
        for (let pair = 0; pair < SESSIONS; pair += 1) {
          const first = await runScenario(candidate.url, scenario, 1)
          const second = await runScenario(candidate.url, scenario, 1)
          baselineEvent.push(first.eventMs[0]!)
          candidateEvent.push(second.eventMs[0]!)
          baselineEntries.push(first.eventEntryCounts[0]!)
          candidateEntries.push(second.eventEntryCounts[0]!)
          baselineScript.push(first.scriptMs[0]!)
          candidateScript.push(second.scriptMs[0]!)
        }
        const scriptNoise = noiseBand(baselineScript, candidateScript)
        const baseScriptMedian = median(baselineScript)
        const scriptRegressionDeltaThresholdMs = scriptRegressionThresholdMs(scenario.id, baseScriptMedian)
        results.push({
          scenario: scenario.id,
          event: noiseBand(baselineEvent, candidateEvent),
          qualifiedEntriesPerInteraction: { baseline: baselineEntries, candidate: candidateEntries },
          script: {
            ...scriptNoise,
            baselineMedianMs: baseScriptMedian,
            candidateMedianMs: median(candidateScript),
            p95AbsDeltaPercentOfMedian: 100 * scriptNoise.p95AbsDeltaMs / baseScriptMedian,
            aaNoiseFloorMs: SCRIPT_NOISE_FLOOR_MS[scenario.id],
            regressionDeltaThresholdMs: scriptRegressionDeltaThresholdMs,
          },
        })
      }
      console.log(JSON.stringify({
        mode: 'A/A diagnostic (not a gate)',
        sessions: SESSIONS,
        harnessSelfTest,
        scenarios: results,
      }, null, 2))
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
        const baseEntries: number[][] = []
        const candEntries: number[][] = []
        const baseScript: number[] = []
        const candScript: number[] = []
        for (let pair = 0; pair < SESSIONS; pair += 1) {
          const baselineResult = await runScenario(base.url, scenario, 1)
          const candidateResult = await runScenario(candidate.url, scenario, 1)
          baseEvent.push(baselineResult.eventMs[0]!)
          candEvent.push(candidateResult.eventMs[0]!)
          baseEntries.push(baselineResult.eventEntryCounts[0]!)
          candEntries.push(candidateResult.eventEntryCounts[0]!)
          baseScript.push(baselineResult.scriptMs[0]!)
          candScript.push(candidateResult.scriptMs[0]!)
        }
        const result: RegressionResult = {
          scenarioId: scenario.id,
          baseScript,
          candScript,
          baseEvent,
          candEvent,
          script: noiseBand(baseScript, candScript),
          event: noiseBand(baseEvent, candEvent),
          regressed: regressed({ scenarioId: scenario.id, baseScript, candScript, baseEvent, candEvent }),
        }
        const ceilingFailed = median(candEvent) > scenario.ceilingMs
        failed ||= result.regressed || ceilingFailed
        reports.push({
          scenario: scenario.id,
          ceilingMs: scenario.ceilingMs,
          baseline: { eventMedianMs: median(baseEvent), scriptMedianMs: median(baseScript), qualifiedEntriesPerInteraction: baseEntries },
          candidate: { eventMedianMs: median(candEvent), scriptMedianMs: median(candScript), qualifiedEntriesPerInteraction: candEntries },
          noise: { event: result.event, script: result.script },
          scriptThreshold: {
            relativePercent: (SCRIPT_RATIO - 1) * 100,
            aaNoiseFloorMs: SCRIPT_NOISE_FLOOR_MS[scenario.id],
            requiredDeltaMs: scriptRegressionThresholdMs(scenario.id, median(baseScript)),
          },
          regressed: result.regressed,
          ceilingFailed,
        })
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
