import assert from 'node:assert/strict'
import { test } from 'node:test'
import { comparePixels, validatePairs, validateSemanticPair, type PixelImage } from './compare-sp2.ts'

function image(width: number, height: number, changed: ReadonlyArray<number> = []): PixelImage {
  const data = new Uint8Array(width * height * 4)
  data.fill(255)
  for (const pixel of changed) data[pixel * 4] = 0
  return { width, height, data }
}

function pixel(image: PixelImage, x: number, y: number, red: number, green = red, blue = red): void {
  const offset = (y * image.width + x) * 4
  image.data[offset] = red
  image.data[offset + 1] = green
  image.data[offset + 2] = blue
  image.data[offset + 3] = 255
}

test('accepts only documented edge antialias tolerance', () => {
  const before = image(20, 20)
  const after = image(20, 20)
  pixel(before, 10, 10, 0)
  pixel(after, 10, 10, 10)
  assert.equal(comparePixels(before, after).accepted, true)
})

test('rejects a uniform five-point RGB shift', () => {
  const before = image(20, 20)
  const after = image(20, 20)
  for (let offset = 0; offset < before.data.length; offset += 4) {
    pixel(before, (offset / 4) % 20, Math.floor(offset / 80), 100)
    pixel(after, (offset / 4) % 20, Math.floor(offset / 80), 105)
  }
  assert.equal(comparePixels(before, after).accepted, false)
})

test('applies edge antialias tolerance symmetrically in either comparison order', () => {
  const left = image(20, 20)
  const right = image(20, 20)
  pixel(left, 10, 10, 149)
  pixel(right, 10, 10, 128)
  const forward = comparePixels(left, right)
  const reverse = comparePixels(right, left)
  assert.deepEqual(forward, reverse)
  assert.equal(forward.changedPixels, 1)
})
test('uses the union edge mask when only the right capture marks an antialias edge', () => {
  const left = image(20, 20)
  const right = image(20, 20)
  for (let y = 0; y < 20; y += 1) for (let x = 0; x < 20; x += 1) {
    pixel(left, x, y, 100)
    pixel(right, x, y, 100)
  }
  pixel(left, 10, 10, 100)
  pixel(left, 11, 10, 145)
  pixel(right, 10, 10, 90)
  pixel(right, 11, 10, 155)
  const forward = comparePixels(left, right)
  const reverse = comparePixels(right, left)
  assert.deepEqual(forward, reverse)
  assert.equal(forward.changedPixels, 0)
})

test('allows only a two-point per-channel non-edge encoding delta', () => {
  const before = image(20, 20)
  const after = image(20, 20)
  pixel(before, 10, 10, 100)
  pixel(after, 10, 10, 102)
  assert.equal(comparePixels(before, after).accepted, true)
})

test('rejects more than 0.5 percent changed pixels', () => {
  const changed = Array.from({ length: 3 }, (_, index) => index + 30)
  assert.equal(comparePixels(image(20, 20), image(20, 20, changed)).accepted, false)
})

test('rejects connected differing region over 0.25 percent of capture', () => {
  assert.equal(comparePixels(image(20, 20), image(20, 20, [210, 211, 212, 213])).accepted, false)
})

test('records mismatched dimensions as a FAILED capture with both sizes', () => {
  const comparison = comparePixels(image(480, 408), image(480, 534))
  assert.equal(comparison.status, 'FAILED')
  assert.equal(comparison.accepted, false)
  assert.deepEqual(comparison.sizeMismatch, {
    left: { width: 480, height: 408 },
    right: { width: 480, height: 534 },
  })
})

test('requires matching semantic pair', () => {
  assert.throws(() => validateSemanticPair(
    { id: 'select/open-light', state: 'open', props: { size: 2, selectedValue: 'indigo' } },
    { id: 'select/open-light', state: 'default', props: { size: 2 } },
  ), /semantic mismatch/)
})
