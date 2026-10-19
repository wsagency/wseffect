import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { build, preview, type PreviewServer } from 'vite'
import { applyCpuThrottle, assertNoiseBand, interactionDuration, noiseBand, regressed, runScenario, SCENARIOS, traceAnimationFrameCount, traceScriptingDuration } from './perf.ts'

const syntheticNoiseFloors = {
  'vl-cell': 38,
  'vl-filter': 42,
  'vl-sort': 26,
  'vl-select': 20,
  'form-field': 26,
  'menus-tick': 29,
} as const
const regression = (overrides: Partial<Parameters<typeof regressed>[0]> = {}) => ({
  scenarioId: 'vl-sort' as const,
  baseScript: [10],
  candScript: [10],
  baseEvent: [40],
  candEvent: [40],
  ...overrides,
})

test('Event Timing uses the longest qualifying entry and records the 16 ms floor', () => {
  assert.equal(interactionDuration([
    { interactionId: 11, duration: 24 },
    { interactionId: 11, duration: 48 },
    { interactionId: 13, duration: 32 },
    { interactionId: 0, duration: 80 },
    { interactionId: 15, duration: 8 },
  ]), 48)
  assert.equal(interactionDuration([{ interactionId: 9, duration: 15 }]), 16)
  assert.equal(interactionDuration([]), 16)
})

test('GATE-P3 applies synthetic A/A script-noise floors and combined Event Timing boundaries', () => {
  assert.equal(regressed(regression({ candScript: [11.1] }), syntheticNoiseFloors), false)
  assert.equal(regressed(regression({ candScript: [36] }), syntheticNoiseFloors), false)
  assert.equal(regressed(regression({ candScript: [36.1] }), syntheticNoiseFloors), true)
  assert.equal(regressed(regression({ baseScript: [300], candScript: [330] }), syntheticNoiseFloors), false)
  assert.equal(regressed(regression({ baseScript: [300], candScript: [330.1] }), syntheticNoiseFloors), true)
  assert.equal(regressed(regression({ scenarioId: 'vl-cell', baseScript: [10], candScript: [48] }), syntheticNoiseFloors), false)
  assert.equal(regressed(regression({ scenarioId: 'vl-cell', baseScript: [10], candScript: [48.1] }), syntheticNoiseFloors), true)
  assert.equal(regressed(regression({ scenarioId: 'vl-select', baseScript: [10], candScript: [30] }), syntheticNoiseFloors), false)
  assert.equal(regressed(regression({ scenarioId: 'vl-select', baseScript: [10], candScript: [30.1] }), syntheticNoiseFloors), true)
  assert.equal(regressed(regression({ baseEvent: [40], candEvent: [48] }), syntheticNoiseFloors), true)
  assert.equal(regressed(regression({ baseEvent: [16], candEvent: [24] }), syntheticNoiseFloors), true)
  assert.equal(regressed(regression({ baseEvent: [72], candEvent: [78] }), syntheticNoiseFloors), false)
  assert.equal(regressed(regression({ baseEvent: [100], candEvent: [109] }), syntheticNoiseFloors), false)
  assert.equal(regressed(regression({ baseEvent: [200], candEvent: [212] }), syntheticNoiseFloors), false)
})

test('GATE-P3 keeps an 8 ms absolute script threshold when the synthetic noise floor is zero', () => {
  const zeroNoiseFloors = {
    'vl-cell': 0,
    'vl-filter': 0,
    'vl-sort': 0,
    'vl-select': 0,
    'form-field': 0,
    'menus-tick': 0,
  }
  assert.equal(regressed(regression({ candScript: [18] }), zeroNoiseFloors), false)
  assert.equal(regressed(regression({ candScript: [18.1] }), zeroNoiseFloors), true)
})

test('GATE-P3 fails a perf runner whose paired A/A noise exceeds 1.5 times its measured floor', () => {
  assert.doesNotThrow(() => assertNoiseBand({ p95AbsDeltaMs: 15, minDeltaMs: -15, maxDeltaMs: 14 }, 10))
  assert.throws(() => assertNoiseBand({ p95AbsDeltaMs: 16, minDeltaMs: -16, maxDeltaMs: 15 }, 10), /runner too noisy/)
})

test('missing measured perf noise floors fail with the runner measurement instruction', async () => {
  const { loadNoiseFloors } = await import('./perf.ts')
  const root = await import('node:os')
  const { mkdtempSync, rmSync } = await import('node:fs')
  const { join } = await import('node:path')
  const directory = mkdtempSync(join(root.tmpdir(), 'wseffect-noise-missing-'))
  try {
    assert.throws(() => loadNoiseFloors(join(directory, 'perf-noise.json')), /perf-noise\.json missing: run `pnpm perf:noise` on the perf runner/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('A/A noise band reports empirical p95 absolute delta and signed range', () => {
  assert.deepEqual(noiseBand([10, 12, 9, 15], [11, 10, 12, 14]), {
    p95AbsDeltaMs: 3,
    minDeltaMs: -2,
    maxDeltaMs: 3,
  })
})

test('measured A/A noise floors round a fractional p95 up to whole milliseconds', async () => {
  const perf = await import('./perf.ts') as unknown as Record<string, unknown>
  assert.equal(typeof perf.roundedNoiseFloorMs, 'function')
  const roundedNoiseFloorMs = perf.roundedNoiseFloorMs as (samples: readonly number[]) => number
  assert.equal(roundedNoiseFloorMs(Array.from({ length: 20 }, (_, index) => index % 2 === 0 ? 10 : 10.25)), 1)
})

test('performance scenarios retain the GATE-P2 ceilings and use trusted input event types', () => {
  assert.deepEqual(SCENARIOS.map(({ id, ceilingMs, inputEventType }) => [id, ceilingMs, inputEventType]), [
    ['vl-cell', 50, 'keydown'],
    ['vl-filter', 50, 'keydown'],
    ['vl-sort', 50, 'click'],
    ['vl-select', 50, 'click'],
    ['form-field', 30, 'keydown'],
    ['menus-tick', 30, 'click'],
  ])
  assert.ok(SCENARIOS.every(({ prepare, warmup, reset, act }) =>
    typeof prepare === 'function' && typeof warmup === 'function' && typeof reset === 'function' && typeof act === 'function'))
})

test('CPU throttle helper sends the CDP 4x command', async () => {
  const calls: Array<{ method: string; params: unknown }> = []
  await applyCpuThrottle({
    send: async (method, params) => {
      calls.push({ method, params })
    },
  })
  assert.deepEqual(calls, [{ method: 'Emulation.setCPUThrottlingRate', params: { rate: 4 } }])
})

test('CPU throttle self-test accepts only synthetic ratios from 3× through 5×', async () => {
  const perf = await import('./perf.ts') as unknown as Record<string, unknown>
  assert.equal(typeof perf.assertThrottleRatio, 'function')
  const assertThrottleRatio = perf.assertThrottleRatio as (ratio: number) => void
  assert.doesNotThrow(() => assertThrottleRatio(3))
  assert.doesNotThrow(() => assertThrottleRatio(5))
  assert.throws(() => assertThrottleRatio(2.99), /3–5/)
  assert.throws(() => assertThrottleRatio(5.01), /3–5/)
})

test('CPU affinity pinning skips cleanly when the configuration or taskset is absent', async () => {
  const perf = await import('./perf.ts') as unknown as Record<string, unknown>
  assert.equal(typeof perf.pinPerfProcess, 'function')
  const pinPerfProcess = perf.pinPerfProcess as (cpus?: string) => void
  const previousCpus = process.env.WSEFFECT_PERF_CPUS
  const previousPath = process.env.PATH
  const previousWarn = console.warn
  const warnings: string[] = []
  console.warn = (message?: unknown) => warnings.push(String(message))
  try {
    delete process.env.WSEFFECT_PERF_CPUS
    assert.doesNotThrow(() => pinPerfProcess())
    process.env.WSEFFECT_PERF_CPUS = '0'
    process.env.PATH = ''
    assert.doesNotThrow(() => pinPerfProcess())
    assert.equal(warnings.length, 2)
  } finally {
    if (previousCpus === undefined) delete process.env.WSEFFECT_PERF_CPUS
    else process.env.WSEFFECT_PERF_CPUS = previousCpus
    if (previousPath === undefined) delete process.env.PATH
    else process.env.PATH = previousPath
    console.warn = previousWarn
  }
})

test('perf noise write arguments require self-test and a reason', async () => {
  const perf = await import('./perf.ts') as unknown as Record<string, unknown>
  assert.equal(typeof perf.parseArguments, 'function')
  const parseArguments = perf.parseArguments as (args: readonly string[]) => {
    readonly selfTest: boolean
    readonly writeNoise: boolean
    readonly reason: string
  }
  const appDir = resolve(import.meta.dirname, '../../apps/gallery')
  const parsed = parseArguments([
    '--app', appDir,
    '--self-test',
    '--write-noise',
    '--reason', 'dedicated perf runner calibration',
  ])
  assert.equal(parsed.selfTest, true)
  assert.equal(parsed.writeNoise, true)
  assert.equal(parsed.reason, 'dedicated perf runner calibration')
  assert.throws(() => parseArguments(['--app', appDir, '--write-noise', '--reason', 'missing self-test']))
  assert.throws(() => parseArguments(['--app', appDir, '--self-test', '--write-noise']))
})
test('trace scripting duration unions script intervals from input dispatch to next paint', async () => {
  const { traceScriptingDuration } = await import('./perf.ts')
  assert.equal(typeof traceScriptingDuration, 'function')
  assert.equal(traceScriptingDuration([
    { name: 'EventDispatch', ph: 'X', ts: 100_000, dur: 30_000, args: { data: { type: 'click' } } },
    { name: 'FunctionCall', ph: 'X', ts: 110_000, dur: 20_000 },
    { name: 'FireAnimationFrame', ph: 'X', ts: 125_000, dur: 10_000 },
    { name: 'Paint', ph: 'X', ts: 150_000, dur: 2_000 },
    { name: 'FunctionCall', ph: 'X', ts: 160_000, dur: 20_000 },
  ]), 35)
})
test('trace scripting duration measures trusted keydown interactions through their next paints', async () => {
  const { traceScriptingDuration } = await import('./perf.ts')
  assert.equal(traceScriptingDuration([
    { name: 'EventDispatch', ph: 'X', ts: 100_000, dur: 10_000, args: { data: { type: 'keydown' } } },
    { name: 'FunctionCall', ph: 'X', ts: 100_000, dur: 20_000 },
    { name: 'Paint', ph: 'X', ts: 130_000, dur: 2_000 },
    { name: 'EventDispatch', ph: 'X', ts: 200_000, dur: 20_000, args: { data: { type: 'keydown' } } },
    { name: 'FunctionCall', ph: 'X', ts: 210_000, dur: 30_000 },
    { name: 'Paint', ph: 'X', ts: 250_000, dur: 2_000 },
    { name: 'FunctionCall', ph: 'X', ts: 260_000, dur: 20_000 },
  ], 'keydown'), 40)
})
test('trace scripting duration ends at the Event Timing next-paint boundary and includes rAF work', async () => {
  const { traceScriptingDuration } = await import('./perf.ts')
  assert.equal(traceScriptingDuration([
    { name: 'EventDispatch', ph: 'X', ts: 100_000, dur: 20_000, args: { data: { type: 'click' } } },
    { name: 'FunctionCall', ph: 'X', ts: 110_000, dur: 20_000 },
    { name: 'FireAnimationFrame', ph: 'X', ts: 125_000, dur: 15_000 },
    { name: 'Paint', ph: 'X', ts: 140_000, dur: 2_000 },
    { name: 'FunctionCall', ph: 'X', ts: 170_000, dur: 20_000 },
  ], 'click', 40), 40)
})

test('trace animation-frame counts include rAF callbacks before the Event Timing paint boundary', () => {
  assert.equal(traceAnimationFrameCount([
    { name: 'EventDispatch', ph: 'X', ts: 100_000, dur: 10_000, args: { data: { type: 'click' } } },
    { name: 'FireAnimationFrame', ph: 'X', ts: 110_000, dur: 2_000 },
    { name: 'FireAnimationFrame', ph: 'X', ts: 120_000, dur: 2_000 },
    { name: 'Paint', ph: 'X', ts: 140_000, dur: 2_000 },
    { name: 'FireAnimationFrame', ph: 'X', ts: 150_000, dur: 2_000 },
  ], 'click', 40), 2)
})

test('trace metrics exclude harness flush work after the marked boundary', async () => {
  const { traceScriptingDuration } = await import('./perf.ts')
  const events = [
    { name: 'EventDispatch', ph: 'X', ts: 100_000, dur: 10_000, args: { data: { type: 'click' } } },
    { name: 'FunctionCall', ph: 'X', ts: 105_000, dur: 5_000 },
    { name: 'FireAnimationFrame', ph: 'X', ts: 112_000, dur: 10_000 },
    { name: 'Paint', ph: 'X', ts: 124_000, dur: 2_000 },
    { name: 'wseffect-harness:flush-start', ph: 'I', ts: 130_000 },
    { name: 'FireAnimationFrame', ph: 'X', ts: 129_900, dur: 200 },
    { name: 'FunctionCall', ph: 'X', ts: 130_002, dur: 4_000 },
    { name: 'Paint', ph: 'X', ts: 150_000, dur: 2_000 },
  ]
  assert.equal(traceScriptingDuration(events, 'click', 50), 20.1)
  assert.equal(traceAnimationFrameCount(events, 'click', 50), 1)
})

test('GATE-P1 includes rAF work after an in-flight Paint and ends at the Event Timing Paint', async () => {
  const { traceScriptingDuration } = await import('./perf.ts')
  const events = [
    { name: 'EventDispatch', ph: 'X', ts: 100_000, dur: 10_000, args: { data: { type: 'click' } } },
    { name: 'Paint', ph: 'X', ts: 115_000, dur: 2_000 },
    { name: 'FireAnimationFrame', ph: 'X', ts: 120_000, dur: 10_000 },
    { name: 'Paint', ph: 'X', ts: 130_000, dur: 2_000 },
  ]
  assert.equal(traceScriptingDuration(events, 'click', 30), 20)
  assert.equal(traceAnimationFrameCount(events, 'click', 30), 1)
})
test('trace window without ET bounds rAF search to the first frame after input', () => {
  const events = [
    { name: 'EventDispatch', ph: 'X', ts: 100_000, dur: 5_000, args: { data: { type: 'click' } } },
    { name: 'Paint', ph: 'X', ts: 110_000, dur: 1_000 },
    { name: 'FireAnimationFrame', ph: 'X', ts: 115_000, dur: 5_000 },
    { name: 'Paint', ph: 'X', ts: 120_000, dur: 1_000 },
    { name: 'FireAnimationFrame', ph: 'X', ts: 125_000, dur: 5_000 },
    { name: 'Paint', ph: 'X', ts: 130_000, dur: 1_000 },
  ]
  assert.equal(traceScriptingDuration(events, 'click'), 10)
  assert.equal(traceAnimationFrameCount(events, 'click'), 1)
})


test('harness self-test observes valid slow/fast clicks and traced rAF work', { timeout: 45_000 }, async () => {
  const { runHarnessSelfTest } = await import('./perf.ts')
  assert.equal(typeof runHarnessSelfTest, 'function')
  const result = await runHarnessSelfTest({ enforceThrottleRatio: false })
  const slowClick = result.eventTiming.find(({ handlerMs }) => handlerMs >= 50)
  const fastClick = result.eventTiming.find(({ handlerMs }) => handlerMs < 16)
  assert.ok(slowClick, 'self-test returns a slow handler measurement')
  assert.ok(fastClick, 'self-test returns a fast handler measurement below 16 ms')
  assert.ok(slowClick.eventMs >= 50, '50 ms click appears in Event Timing')
  assert.ok(slowClick.qualifiedEntries > 0, '50 ms click records a real Event Timing entry')
  assert.ok(result.animationFrameCount > 0, 'real Chromium trace includes the scheduled rAF callback')
})

test('runScenario captures input durations and records entry counts for every Gallery scenario', { timeout: 90_000 }, async () => {
  const appDir = resolve(import.meta.dirname, '../../apps/gallery')
  let server: PreviewServer | undefined
  try {
    server = await preview({
      root: appDir,
      configFile: resolve(appDir, 'vite.config.ts'),
      logLevel: 'error',
      preview: { host: '127.0.0.1', port: 0, strictPort: false },
    })
    const baseUrl = server.resolvedUrls?.local?.[0]
    assert.ok(baseUrl, 'Vite preview exposes a local URL')
    for (const scenario of SCENARIOS) {
      const sessions = scenario.id === 'vl-sort' ? 2 : 1
      const result = await runScenario(baseUrl, scenario, sessions)
      assert.equal(result.eventMs.length, sessions, `${scenario.id} Event Timing sample count`)
      assert.equal(result.scriptMs.length, sessions, `${scenario.id} trace sample count`)
      assert.equal(result.animationFrameCounts.length, sessions, `${scenario.id} rAF trace sample count`)
      assert.equal(result.eventEntryCounts.length, sessions, `${scenario.id} interaction entry-count sample count`)
      assert.ok(result.eventEntryCounts.every((counts) => counts.every((count) => Number.isInteger(count) && count > 0)),
        `${scenario.id} records qualified Event Timing entry counts when present`)
      assert.ok(result.scriptMs.every((duration) => duration > 0), `${scenario.id} trace contains scripting in its interaction window`)
      assert.ok(result.eventMs.every((duration) => duration >= 16), `${scenario.id} Event Timing preserves the 16 ms threshold`)
    }
  } finally {
    await server?.close()
  }
})


