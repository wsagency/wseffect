import assert from 'node:assert/strict'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { build, preview } from 'vite'
import { applyCpuThrottle, interactionDuration, noiseBand, regressed, runScenario, SCENARIOS } from './perf.ts'

const regression = (overrides: Partial<Parameters<typeof regressed>[0]> = {}) => ({
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

test('GATE-P3 uses strict script and combined event regression boundaries', () => {
  assert.equal(regressed(regression({ candScript: [11.1] })), true)
  assert.equal(regressed(regression({ candScript: [11] })), false)
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

test('performance scenarios retain the GATE-P2 ceilings', () => {
  assert.deepEqual(SCENARIOS.map(({ id, ceilingMs }) => [id, ceilingMs]), [
    ['vl-cell', 50],
    ['vl-filter', 50],
    ['vl-sort', 50],
    ['vl-select', 50],
    ['form-field', 30],
    ['menus-tick', 30],
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

test('runScenario measures two mini-app sessions at the shared virtual-list route', { timeout: 45_000 }, async () => {
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
    const scenario = SCENARIOS.find(({ id }) => id === 'vl-sort')
    assert.ok(scenario, 'the shared virtual-list sort scenario exists')
    const result = await runScenario(baseUrl, scenario, 2)
    assert.equal(result.eventMs.length, 2)
    assert.equal(result.scriptMs.length, 2)
    assert.ok(result.eventMs.every((duration) => duration >= 16))
  } finally {
    await server.close()
  }
})
