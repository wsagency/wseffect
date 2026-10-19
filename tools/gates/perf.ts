import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { hostname, tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser, type CDPSession, type Page } from '@playwright/test'
import { preview } from 'vite'
import { SCENARIOS, type PerfScenario } from './scenarios.ts'

export { SCENARIOS }

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const BASELINE_PATH = join(ROOT, 'bench/baselines/perf.json')
const NOISE_BASELINE_PATH = join(ROOT, 'bench/baselines/perf-noise.json')
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
const SCRIPT_ABSOLUTE_MS = 8

export type ScenarioNoiseFloors = Record<PerfScenario['id'], number>

export interface PerfNoiseBaseline {
  readonly runner: string
  readonly node: string
  readonly chromium: string
  readonly commit: string
  readonly reason: string
  readonly measuredAt: string
  readonly pairs: number
  readonly floorsMs: ScenarioNoiseFloors
}

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
  readonly animationFrameCount: number
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

export function loadNoiseFloors(path = NOISE_BASELINE_PATH): ScenarioNoiseFloors {
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown
  } catch (error) {
    if (error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      throw new Error('perf-noise.json missing: run `pnpm perf:noise` on the perf runner', { cause: error })
    }
    throw error
  }
  if (parsed === null || typeof parsed !== 'object' || !('floorsMs' in parsed)) {
    throw new Error('invalid perf-noise.json: floorsMs missing')
  }
  const floors = parsed.floorsMs
  if (floors === null || typeof floors !== 'object') throw new Error('invalid perf-noise.json: floorsMs missing')
  const values = new Map(Object.entries(floors))
  const result = {} as ScenarioNoiseFloors
  for (const { id } of SCENARIOS) {
    const value = values.get(id)
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error(`invalid perf-noise.json: ${id} noise floor missing or negative`)
    }
    result[id] = value
  }
  return result
}

export function assertNoiseBand(band: NoiseBand, floorMs: number): void {
  if (band.p95AbsDeltaMs > floorMs * 1.5) {
    throw new Error(`perf runner too noisy: paired A/A p95 ${band.p95AbsDeltaMs.toFixed(2)} ms exceeds ${(floorMs * 1.5).toFixed(2)} ms (1.5× measured floor)`)
  }
}

export function assertQualifiedEntryCoverage(label: string, counts: readonly (readonly number[])[]): void {
  const missing = counts.filter((interaction) => interaction.length === 0).length
  if (missing > counts.length / 2) {
    throw new Error(`${label}: ${missing}/${counts.length} interactions have no qualifying Event Timing entries`)
  }
}

function scriptRegressionThresholdMs(scenarioId: PerfScenario['id'], baseMedianMs: number, noiseFloorMs: number): number {
  return Math.max((SCRIPT_RATIO - 1) * baseMedianMs, SCRIPT_ABSOLUTE_MS, noiseFloorMs)
}

export function regressed(input: RegressionInput, noiseFloors: ScenarioNoiseFloors): boolean {
  const baseScript = median(input.baseScript)
  const candScript = median(input.candScript)
  const baseEvent = median(input.baseEvent)
  const candEvent = median(input.candEvent)
  return candScript - baseScript > scriptRegressionThresholdMs(input.scenarioId, baseScript, noiseFloors[input.scenarioId])
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

export function traceScriptingDuration(
  events: readonly TraceEvent[],
  inputEventType: PerfScenario['inputEventType'] = 'click',
  eventTimingDurationMs?: number,
): number {
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
    const eventTimingEnd = eventTimingDurationMs === undefined
      ? undefined
      : inputStart + eventTimingDurationMs * 1_000
    const presentationEnd = presentations.find((event) => eventTimingEnd === undefined
      ? event.ts! > inputStart
      : event.ts! >= eventTimingEnd)?.ts
    const windowEnd = presentationEnd ?? eventTimingEnd
    if (windowEnd === undefined) throw new Error(`trace did not contain a Paint or Commit after ${inputEventType}`)

    const intervals = events
      .filter((event) => SCRIPT_TRACE_EVENTS.has(event.name ?? '')
        && event.ph === 'X'
        && typeof event.ts === 'number'
        && typeof event.dur === 'number'
        && event.dur > 0
        && event.ts < windowEnd
        && event.ts + event.dur > inputStart)
      .map((event) => [Math.max(event.ts!, inputStart), Math.min(event.ts! + event.dur!, windowEnd)] as const)
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
export function traceAnimationFrameCount(
  events: readonly TraceEvent[],
  inputEventType: PerfScenario['inputEventType'],
  eventTimingDurationMs?: number,
): number {
  const input = events.find((event) => event.name === 'EventDispatch'
    && event.ph === 'X'
    && event.args?.data?.type === inputEventType
    && typeof event.ts === 'number')
  if (input?.ts === undefined) return 0
  const presentations = events
    .filter((event) => (event.name === 'Paint' || event.name === 'Commit') && typeof event.ts === 'number')
    .sort((left, right) => left.ts! - right.ts!)
  const eventTimingEnd = eventTimingDurationMs === undefined ? undefined : input.ts + eventTimingDurationMs * 1_000
  const presentationEnd = presentations.find((event) => eventTimingEnd === undefined
    ? event.ts! > input.ts!
    : event.ts! >= eventTimingEnd)?.ts
  const windowEnd = presentationEnd ?? eventTimingEnd
  if (windowEnd === undefined) return 0
  return events.filter((event) => event.name === 'FireAnimationFrame'
    && event.ph === 'X'
    && typeof event.ts === 'number'
    && event.ts >= input.ts!
    && event.ts < windowEnd).length
}

async function installEventTimingObserver(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = window as Window & {
      __perfEventEntries?: EventEntry[]
      __perfEventObserver?: PerformanceObserver
      __perfEventCutoff?: number
    }
    target.__perfEventEntries = []
    target.__perfEventObserver?.disconnect()
    target.__perfEventCutoff = performance.now()
    target.__perfEventObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const event = entry as PerformanceEventTiming & { interactionId: number }
        if (event.interactionId > 0 && event.startTime >= target.__perfEventCutoff!) target.__perfEventEntries!.push({
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

async function traceInteraction(
  client: CDPSession,
  page: Page,
  scenario: PerfScenario,
): Promise<{ readonly entries: EventEntry[]; readonly scriptMs: number; readonly animationFrameCount: number }> {
  const events: TraceEvent[] = []
  const onData = ({ value }: { readonly value: TraceEvent[] }) => events.push(...value)
  client.on('Tracing.dataCollected', onData)
  await client.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline' })
  let entries: EventEntry[] = []
  try {
    await scenario.act(page)
    entries = await eventEntries(page)
  } finally {
    const complete = new Promise<void>((resolveComplete) => client.once('Tracing.tracingComplete', () => resolveComplete()))
    await client.send('Tracing.end')
    await complete
    client.off('Tracing.dataCollected', onData)
  }
  const duration = interactionDuration(entries)
  return {
    entries,
    scriptMs: traceScriptingDuration(events, scenario.inputEventType, duration),
    animationFrameCount: traceAnimationFrameCount(events, scenario.inputEventType, duration),
  }
}

export async function runScenario(
  baseUrl: string,
  scenario: PerfScenario,
  sessions = SESSIONS,
  sharedBrowser?: Browser,
): Promise<{ eventMs: number[]; eventEntryCounts: number[][]; scriptMs: number[]; animationFrameCounts: number[] }> {
  const ownsBrowser = sharedBrowser === undefined
  const browser = sharedBrowser ?? await chromium.launch()
  const eventMs: number[] = []
  const eventEntryCounts: number[][] = []
  const scriptMs: number[] = []
  const animationFrameCounts: number[] = []
  try {
    for (let session = 0; session < sessions; session += 1) {
      const context = await browser.newContext()
      const page = await context.newPage()
      const client = await context.newCDPSession(page)
      try {
        await applyCpuThrottle(client)
        await page.goto(new URL(scenario.route, baseUrl).href, { waitUntil: 'networkidle' })
        await page.locator(`[data-perf="${HOOK_BY_SCENARIO[scenario.id]}"]`).waitFor({ state: 'visible' })
        await scenario.prepare(page)
        await scenario.warmup(page)
        await scenario.reset(page)
        await installEventTimingObserver(page)
        const result = await traceInteraction(client, page, scenario)
        scriptMs.push(result.scriptMs)
        animationFrameCounts.push(result.animationFrameCount)
        eventMs.push(interactionDuration(result.entries))
        eventEntryCounts.push(qualifiedEntryCounts(result.entries))
      } finally {
        await client.detach()
        await context.close()
      }
    }
  } finally {
    if (ownsBrowser) await browser.close()
  }
  return { eventMs, eventEntryCounts, scriptMs, animationFrameCounts }
}
export async function runHarnessSelfTest(): Promise<HarnessSelfTestReport> {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const client = await page.context().newCDPSession(page)
  try {
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    await page.setContent('<button id="slow">50 ms handler</button><button id="fast">5 ms handler</button><button id="frame">rAF render</button>')
    await page.evaluate(() => {
      const target = window as Window & {
        __selfTestTrusted?: boolean
        __selfTestHandlerMs?: number
      }
      const busyWait = (milliseconds: number, event: Event) => {
        target.__selfTestTrusted = event.isTrusted
        const start = performance.now()
        const deadline = start + milliseconds
        while (performance.now() < deadline) {
          // Intentional busy wait to exercise Event Timing.
        }
        target.__selfTestHandlerMs = performance.now() - start
      }
      document.querySelector('#slow')!.addEventListener('click', (event) => busyWait(50, event))
      document.querySelector('#fast')!.addEventListener('click', (event) => busyWait(5, event))
      document.querySelector('#frame')!.addEventListener('click', () => requestAnimationFrame(() => {
        const deadline = performance.now() + 5
        while (performance.now() < deadline) {
          // Intentional frame work to verify the trace window includes rAF callbacks.
        }
      }))
    })

    const eventTiming: SelfTestEventTiming[] = []
    for (const expectedHandlerMs of [50, 5]) {
      await installEventTimingObserver(page)
      await page.locator(expectedHandlerMs === 50 ? '#slow' : '#fast').click()
      const entries = await eventEntries(page)
      const result = await page.evaluate(() => {
        const target = window as Window & {
          __selfTestTrusted?: boolean
          __selfTestHandlerMs?: number
        }
        return {
          trusted: target.__selfTestTrusted,
          handlerMs: target.__selfTestHandlerMs ?? 0,
        }
      })
      if (result.trusted !== true) throw new Error('harness self-test click was not trusted browser input')
      const measured = {
        handlerMs: result.handlerMs,
        eventMs: interactionDuration(entries),
        qualifiedEntries: entries.length,
      }
      eventTiming.push(measured)
      if (expectedHandlerMs === 50 && (measured.handlerMs < 50 || measured.eventMs < 50 || measured.qualifiedEntries === 0)) {
        throw new Error(`50 ms self-test click was not captured by Event Timing: ${JSON.stringify(measured)}`)
      }
      if (expectedHandlerMs === 5 && measured.handlerMs >= 16) {
        throw new Error(`5 ms self-test handler exceeded the 16 ms limit: ${JSON.stringify(measured)}`)
      }
    }
    await installEventTimingObserver(page)
    const frameScenario: PerfScenario = {
      id: 'menus-tick',
      route: '/',
      inputEventType: 'click',
      prepare: async () => {},
      warmup: async () => {},
      reset: async () => {},
      act: async (targetPage) => targetPage.locator('#frame').click(),
      ceilingMs: 30,
    }
    const frameTrace = await traceInteraction(client, page, frameScenario)
    if (frameTrace.animationFrameCount === 0) throw new Error('harness self-test trace did not include rAF script work')


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
    assertThrottleRatio(ratio)
    return {
      eventTiming,
      cpuThrottle: { iterations, unthrottledMs, throttledMs, ratio },
      animationFrameCount: frameTrace.animationFrameCount,
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

export function parseArguments(args: readonly string[]): { appDir: string; selfTest: boolean; writeNoise: boolean; reason: string } {
  let appDir = ''
  let selfTest = false
  let writeNoise = false
  let reason = ''
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!
    if (arg === '--app') {
      const value = args[++index]
      if (value === undefined) throw new Error('--app requires a directory')
      appDir = resolve(value)
    } else if (arg === '--self-test') {
      selfTest = true
    } else if (arg === '--write-noise') {
      writeNoise = true
    } else if (arg === '--reason') {
      const value = args[++index]
      if (value === undefined) throw new Error('--reason requires text')
      reason = value
    } else {
      throw new Error(`unknown argument: ${arg}`)
    }
  }
  if (writeNoise && !selfTest) throw new Error('--write-noise requires --self-test')
  if (writeNoise && reason.trim() === '') throw new Error('--write-noise requires a non-empty --reason')
  if (!writeNoise && reason !== '') throw new Error('--reason requires --write-noise')
  if (appDir === '') throw new Error('usage: pnpm gate:perf --app <app-directory> [--self-test [--write-noise --reason <text>]]')
  if (!statSync(appDir).isDirectory()) throw new Error(`app directory does not exist: ${appDir}`)
  return { appDir, selfTest, writeNoise, reason }
}

export function pinPerfProcess(cpus = process.env.WSEFFECT_PERF_CPUS): void {
  if (cpus === undefined || cpus.trim() === '') {
    console.warn('CPU affinity pinning skipped: WSEFFECT_PERF_CPUS is not configured')
    return
  }
  try {
    execFileSync('taskset', ['-pc', cpus, String(process.pid)], { stdio: 'inherit' })
  } catch (error) {
    if (error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      console.warn('CPU affinity pinning skipped: taskset is not installed')
      return
    }
    throw error
  }
}

function pairedNoise(samples: readonly number[]): NoiseBand {
  if (samples.length !== SESSIONS * 2) throw new Error(`expected ${SESSIONS * 2} paired noise samples, got ${samples.length}`)
  return noiseBand(samples.filter((_, index) => index % 2 === 0), samples.filter((_, index) => index % 2 === 1))
}

export function roundedNoiseFloorMs(samples: readonly number[]): number {
  return Math.ceil(pairedNoise(samples).p95AbsDeltaMs)
}

export function assertThrottleRatio(ratio: number): void {
  if (!Number.isFinite(ratio) || ratio < 3 || ratio > 5) {
    throw new Error(`4× CPU throttle self-test ratio outside 3–5: ${ratio.toFixed(2)}×`)
  }
}

async function measureNoiseFloors(baseUrl: string, browser: Browser): Promise<ScenarioNoiseFloors> {
  const floors = {} as ScenarioNoiseFloors
  for (const scenario of SCENARIOS) {
    const result = await runScenario(baseUrl, scenario, SESSIONS * 2, browser)
    assertQualifiedEntryCoverage(`${scenario.id} A/A noise measurement`, result.eventEntryCounts)
    floors[scenario.id] = roundedNoiseFloorMs(result.scriptMs)
  }
  return floors
}

async function assertRunnerNoise(baseUrl: string, browser: Browser, floors: ScenarioNoiseFloors): Promise<void> {
  for (const scenario of SCENARIOS) {
    const result = await runScenario(baseUrl, scenario, SESSIONS * 2, browser)
    assertQualifiedEntryCoverage(`${scenario.id} A/A noise check`, result.eventEntryCounts)
    assertNoiseBand(pairedNoise(result.scriptMs), floors[scenario.id])
  }
}

async function runCli(): Promise<void> {
  const { appDir, selfTest, writeNoise, reason } = parseArguments(process.argv.slice(2))
  const noiseFloors = selfTest ? undefined : loadNoiseFloors()
  if (!selfTest || writeNoise) pinPerfProcess()

  execFileSync('pnpm', ['--dir', appDir, 'build'], { cwd: ROOT, stdio: 'inherit' })
  const candidate = await startPreview(appDir)
  try {
    const harnessSelfTest = await runHarnessSelfTest()
    if (selfTest && !writeNoise) {
      const browser = await chromium.launch()
      try {
        const results = []
        for (const scenario of SCENARIOS) {
          const samples = await runScenario(candidate.url, scenario, SESSIONS * 2, browser)
          assertQualifiedEntryCoverage(`${scenario.id} A/A self-test`, samples.eventEntryCounts)
          results.push({
            scenario: scenario.id,
            script: pairedNoise(samples.scriptMs),
            event: pairedNoise(samples.eventMs),
            animationFrameCounts: samples.animationFrameCounts,
            qualifiedEntriesPerInteraction: samples.eventEntryCounts,
          })
        }
        console.log(JSON.stringify({
          mode: 'A/A diagnostic (not a gate)',
          sessionsPerSide: SESSIONS,
          harnessSelfTest,
          scenarios: results,
        }, null, 2))
      } finally {
        await browser.close()
      }
      return
    }

    if (writeNoise) {
      const browser = await chromium.launch()
      try {
        const floorsMs = await measureNoiseFloors(candidate.url, browser)
        const noiseBaseline: PerfNoiseBaseline = {
          runner: process.env.WSEFFECT_PERF_RUNNER_NAME ?? hostname(),
          node: process.version,
          chromium: browser.version(),
          commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
          measuredAt: new Date().toISOString(),
          reason,
          pairs: SESSIONS,
          floorsMs,
        }
        writeFileSync(NOISE_BASELINE_PATH, `${JSON.stringify(noiseBaseline, null, 2)}\n`)
        console.log(JSON.stringify(noiseBaseline, null, 2))
      } finally {
        await browser.close()
      }
      return
    }

    if (noiseFloors === undefined) throw new Error('noise floors are required for the perf gate')
    const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as { commit: string }
    const worktree = mkdtempSync(join(tmpdir(), 'wseffect-perf-'))
    try {
      execFileSync('git', ['worktree', 'add', '--detach', worktree, baseline.commit], { cwd: ROOT, stdio: 'inherit' })
      execFileSync('pnpm', ['install', '--frozen-lockfile'], { cwd: worktree, stdio: 'inherit' })
      const appRelative = relative(ROOT, appDir)
      const baselineAppDir = resolve(worktree, appRelative)
      execFileSync('pnpm', ['--dir', baselineAppDir, 'build'], { cwd: worktree, stdio: 'inherit' })
      const base = await startPreview(baselineAppDir)
      const browser = await chromium.launch()
      try {
        const reports = []
        let failed = false
        await assertRunnerNoise(candidate.url, browser, noiseFloors)
        for (const scenario of SCENARIOS) {
          const baseEvent: number[] = []
          const candEvent: number[] = []
          const baseEntries: number[][] = []
          const candEntries: number[][] = []
          const baseScript: number[] = []
          const baseAnimationFrameCounts: number[] = []
          const candidateAnimationFrameCounts: number[] = []
          const candScript: number[] = []
          for (let pair = 0; pair < SESSIONS; pair += 1) {
            const baselineResult = await runScenario(base.url, scenario, 1, browser)
            const candidateResult = await runScenario(candidate.url, scenario, 1, browser)
            baseEvent.push(baselineResult.eventMs[0]!)
            candEvent.push(candidateResult.eventMs[0]!)
            baseEntries.push(baselineResult.eventEntryCounts[0]!)
            candEntries.push(candidateResult.eventEntryCounts[0]!)
            baseScript.push(baselineResult.scriptMs[0]!)
            baseAnimationFrameCounts.push(baselineResult.animationFrameCounts[0]!)
            candidateAnimationFrameCounts.push(candidateResult.animationFrameCounts[0]!)
            candScript.push(candidateResult.scriptMs[0]!)
          }
          assertQualifiedEntryCoverage(`${scenario.id} baseline`, baseEntries)
          assertQualifiedEntryCoverage(`${scenario.id} candidate`, candEntries)
          const result: RegressionResult = {
            scenarioId: scenario.id,
            baseScript,
            candScript,
            baseEvent,
            candEvent,
            script: noiseBand(baseScript, candScript),
            event: noiseBand(baseEvent, candEvent),
            regressed: regressed({ scenarioId: scenario.id, baseScript, candScript, baseEvent, candEvent }, noiseFloors),
          }
          const ceilingFailed = median(candEvent) > scenario.ceilingMs
          failed ||= result.regressed || ceilingFailed
          reports.push({
            scenario: scenario.id,
            ceilingMs: scenario.ceilingMs,
            baseline: {
              eventMedianMs: median(baseEvent),
              scriptMedianMs: median(baseScript),
              animationFrameCounts: baseAnimationFrameCounts,
              qualifiedEntriesPerInteraction: baseEntries,
            },
            candidate: {
              eventMedianMs: median(candEvent),
              scriptMedianMs: median(candScript),
              animationFrameCounts: candidateAnimationFrameCounts,
              qualifiedEntriesPerInteraction: candEntries,
            },
            noise: { event: result.event, script: result.script },
            scriptThreshold: {
              relativePercent: (SCRIPT_RATIO - 1) * 100,
              aaNoiseFloorMs: noiseFloors[scenario.id],
              requiredDeltaMs: scriptRegressionThresholdMs(scenario.id, median(baseScript), noiseFloors[scenario.id]),
            },
            regressed: result.regressed,
            ceilingFailed,
          })
        }
        console.log(JSON.stringify({ baselineCommit: baseline.commit, candidateCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(), sessionsPerScenario: SESSIONS, harnessSelfTest, scenarios: reports }, null, 2))
        if (failed) process.exitCode = 1
      } finally {
        await browser.close()
        await base.server.close()
      }
    } finally {
      execFileSync('git', ['worktree', 'remove', '--force', worktree], { cwd: ROOT, stdio: 'inherit' })
      rmSync(worktree, { recursive: true, force: true })
    }
  } finally {
    await candidate.server.close()
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
