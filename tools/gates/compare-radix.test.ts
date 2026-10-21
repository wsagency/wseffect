import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import { median, aaP95AbsDelta, noiseScreen, readRadixFixtureCommit, applySettingChange, runHarnessSelfTestWithRafRetry, resetDialogForBenchmark, pressBenchmarkButton, resetDropdownForBenchmark } from '../bench/compare-radix.ts'

test('median handles odd and even sample counts without mutating input', () => {
  const values = [9, 1, 5, 3]
  assert.equal(median(values), 4)
  assert.equal(median([9, 1, 5]), 5)
  assert.deepEqual(values, [9, 1, 5, 3])
})

test('A/A band is the nearest-rank p95 of adjacent absolute deltas', () => {
  assert.equal(aaP95AbsDelta([1, 10, 5, 6, 9, 8, 7, 0, 4, 3]), 9)
})

test('noise screen requires the absolute median gap to exceed the A/A band', () => {
  assert.equal(noiseScreen(10, 14, 4), '—')
  assert.equal(noiseScreen(15, 10, 4), 'radix2solid')
  assert.equal(noiseScreen(11, 18, 4), 'wseffect')
})
test('reads the pinned radix fixture commit from its committed source metadata', () => {
  assert.equal(readRadixFixtureCommit(join(process.cwd(), 'bench/radix2solid/library-source.json')), '383676172abb84b4a1d2e54a087d290437ee8848')
})
test('theme control changes use trusted key events for native selects and wrapped buttons', async () => {
  const selectCalls: string[] = []
  const selectPage = {
    locator: () => ({
      evaluate: async () => true,
      press: async (key: string) => { selectCalls.push(`select-key:${key}`) },
    }),
  }
  await applySettingChange(selectPage as never, 'theme-accent', 'Accent color')
  assert.deepEqual(selectCalls, ['select-key:ArrowDown'])

  const buttonCalls: string[] = []
  const buttonPage = {
    locator: () => ({
      evaluate: async () => false,
      getByRole: (_role: string, options: { name: string }) => ({ press: async (key: string) => { buttonCalls.push(`button:${options.name}:${key}`) } }),
    }),
  }
  await applySettingChange(buttonPage as never, 'theme-appearance', 'Appearance')
  assert.deepEqual(buttonCalls, ['button:Appearance:Space'])
})
test('retries only the transient self-test rAF boundary failure', async () => {
  let attempts = 0
  const report = { eventTiming: [], cpuThrottle: { iterations: 1, unthrottledMs: 1, throttledMs: 4, ratio: 4 }, animationFrameCount: 1 }
  const result = await runHarnessSelfTestWithRafRetry(async () => {
    attempts += 1
    if (attempts === 1) throw new Error('harness self-test trace did not include rAF script work')
    return report as never
  })
  assert.equal(result.retries, 1)
  assert.equal(result.report, report)
  assert.equal(attempts, 2)
})
test('resets an open dialog by reloading the route after warmup', async () => {
  const reloads: string[] = []
  await resetDialogForBenchmark({ reload: async (options: { waitUntil: string }) => { reloads.push(options.waitUntil) } } as never)
  assert.deepEqual(reloads, ['networkidle'])
})
test('presses the matched dropdown control inside its benchmark hook', async () => {
  const calls: string[] = []
  const page = {
    locator: (selector: string) => {
      assert.equal(selector, '[data-perf="dropdown-open"]')
      return { getByRole: (role: string) => ({ press: async (key: string) => { calls.push(`${role}:${key}`) } }) }
    },
  }
  await pressBenchmarkButton(page as never, 'dropdown-open', 'ArrowDown')
  assert.deepEqual(calls, ['button:ArrowDown'])
})
test('resets an open dropdown by reloading the route after warmup', async () => {
  const reloads: string[] = []
  await resetDropdownForBenchmark({ reload: async (options: { waitUntil: string }) => { reloads.push(options.waitUntil) } } as never)
  assert.deepEqual(reloads, ['networkidle'])
})
