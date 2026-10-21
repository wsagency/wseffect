import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import { median, aaP95AbsDelta, noiseScreen, readRadixFixtureCommit, applySettingChange } from '../bench/compare-radix.ts'

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
test('setting changes work for both select hooks and wrapped button hooks', async () => {
  const selectCalls: string[] = []
  const selectPage = {
    locator: () => ({
      evaluate: async () => true,
      selectOption: async (value: string) => { selectCalls.push(`select:${value}`) },
    }),
  }
  await applySettingChange(selectPage as never, 'theme-accent', 'Accent color', 'crimson')
  assert.deepEqual(selectCalls, ['select:crimson'])

  const buttonCalls: string[] = []
  const buttonPage = {
    locator: () => ({
      evaluate: async () => false,
      getByRole: (_role: string, options: { name: string }) => ({ click: async () => { buttonCalls.push(`button:${options.name}`) } }),
    }),
  }
  await applySettingChange(buttonPage as never, 'theme-appearance', 'Appearance', 'dark')
  assert.deepEqual(buttonCalls, ['button:Appearance'])
})
