import assert from 'node:assert/strict'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { build, preview } from 'vite'
import { applyCpuThrottle, interactionDuration, noiseBand, regressed, runScenario, SCENARIOS } from './perf.ts'

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

test('GATE-P3 applies measured A/A script-noise floors and combined Event Timing boundaries', () => {
  assert.equal(regressed(regression({ candScript: [11.1] })), false)
  assert.equal(regressed(regression({ candScript: [36] })), false)
  assert.equal(regressed(regression({ candScript: [36.1] })), true)
  assert.equal(regressed(regression({ baseScript: [300], candScript: [330] })), false)
  assert.equal(regressed(regression({ baseScript: [300], candScript: [330.1] })), true)
  assert.equal(regressed(regression({ scenarioId: 'vl-cell', baseScript: [10], candScript: [48] })), false)
  assert.equal(regressed(regression({ scenarioId: 'vl-cell', baseScript: [10], candScript: [48.1] })), true)
  assert.equal(regressed(regression({ scenarioId: 'vl-select', baseScript: [10], candScript: [30] })), false)
  assert.equal(regressed(regression({ scenarioId: 'vl-select', baseScript: [10], candScript: [30.1] })), true)
  assert.equal(regressed(regression({ baseEvent: [40], candEvent: [48] })), true)
  assert.equal(regressed(regression({ baseEvent: [16], candEvent: [24] })), true)
  assert.equal(regressed(regression({ baseEvent: [72], candEvent: [78] })), false)
  assert.equal(regressed(regression({ baseEvent: [100], candEvent: [109] })), false)
  assert.equal(regressed(regression({ baseEvent: [200], candEvent: [212] })), false)
})

test('A/A noise band reports empirical p95 absolute delta and signed range', () => {
  assert.deepEqual(noiseBand([10, 12, 9, 15], [11, 10, 12, 14]), {
    p95AbsDeltaMs: 3,
    minDeltaMs: -2,
    maxDeltaMs: 3,
  })
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

test('harness self-test observes slow and fast trusted clicks and verifies CPU throttling', { timeout: 45_000 }, async () => {
  const { runHarnessSelfTest } = await import('./perf.ts')
  assert.equal(typeof runHarnessSelfTest, 'function')
  const result = await runHarnessSelfTest()
  const slowClick = result.eventTiming.find(({ handlerMs }) => handlerMs === 50)
  const fastClick = result.eventTiming.find(({ handlerMs }) => handlerMs === 5)
  assert.ok(slowClick, 'self-test returns the slow click result')
  assert.ok(fastClick, 'self-test returns the fast click result')
  assert.ok(slowClick.eventMs >= 50, '50 ms click appears in Event Timing')
  assert.ok(slowClick.qualifiedEntries > 0, '50 ms click records a real Event Timing entry')
  assert.ok(fastClick.eventMs < 50, '5 ms click is not reported as a 50 ms interaction')
  assert.ok(result.cpuThrottle.throttledMs > result.cpuThrottle.unthrottledMs)
  assert.ok(result.cpuThrottle.ratio > 2, 'the in-page loop verifies meaningful 4× throttling')
})


test('runScenario captures qualified input interactions and trace scripts for every mini-app scenario', { timeout: 90_000 }, async () => {
  const fixtureDir = resolve(import.meta.dirname, '../fixtures/mini-app')
  await build({ root: fixtureDir, configFile: join(fixtureDir, 'vite.config.ts'), logLevel: 'error' })
  const server = await preview({
    root: fixtureDir,
    configFile: join(fixtureDir, 'vite.config.ts'),
    logLevel: 'error',
    preview: { host: '127.0.0.1', port: 0, strictPort: false },
  })
  const baseUrl = server.resolvedUrls?.local?.[0]
  assert.ok(baseUrl, 'Vite preview exposes a local URL')
  try {
    for (const scenario of SCENARIOS) {
      const sessions = scenario.id === 'vl-sort' ? 2 : 1
      const result = await runScenario(baseUrl, scenario, sessions)
      assert.equal(result.eventMs.length, sessions, `${scenario.id} Event Timing sample count`)
      assert.equal(result.scriptMs.length, sessions, `${scenario.id} trace sample count`)
      assert.equal(result.eventEntryCounts.length, sessions, `${scenario.id} interaction entry-count sample count`)
      assert.ok(result.eventEntryCounts.every((counts) => counts.length > 0
        && counts.every((count) => Number.isInteger(count) && count > 0)), `${scenario.id} records qualified Event Timing entries`)
      assert.ok(result.scriptMs.every((duration) => duration > 0), `${scenario.id} trace contains scripting in its interaction window`)
      assert.ok(result.eventMs.every((duration) => duration >= 16), `${scenario.id} Event Timing preserves the 16 ms threshold`)
    }
  } finally {
    await server.close()
  }
})
