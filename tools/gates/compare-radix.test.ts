import assert from 'node:assert/strict'
import { test } from 'node:test'
import { median, aaP95AbsDelta, noiseScreen } from '../bench/compare-radix.ts'

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
