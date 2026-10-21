import assert from 'node:assert/strict'
import { test } from 'node:test'
import { comparePixels, validatePairs, validateSemanticPair, type PixelImage } from './compare-sp2.ts'

function image(width: number, height: number, changed: ReadonlyArray<number> = []): PixelImage {
  const data = new Uint8Array(width * height * 4)
  data.fill(255)
  for (const pixel of changed) data[pixel * 4] = 0
  return { width, height, data }
}

test('accepts only documented edge tolerance', () => {
  const before = image(20, 20, [210])
  const after = image(20, 20, [210, 211])
  const result = comparePixels(before, after)
  assert.equal(result.accepted, true)
  assert.ok(result.changedPercent <= 0.5)
})

test('rejects more than 0.5 percent changed pixels', () => {
  const changed = Array.from({ length: 3 }, (_, index) => index + 30)
  assert.equal(comparePixels(image(20, 20), image(20, 20, changed)).accepted, false)
})

test('rejects connected differing region over 0.25 percent of capture', () => {
  assert.equal(comparePixels(image(20, 20), image(20, 20, [210, 211, 212, 213])).accepted, false)
})

test('requires matching semantic pair', () => {
  assert.throws(() => validateSemanticPair(
    { id: 'select/open-light', state: 'open', props: { size: 2, selectedValue: 'indigo' } },
    { id: 'select/open-light', state: 'default', props: { size: 2 } },
  ), /semantic mismatch/)
})
