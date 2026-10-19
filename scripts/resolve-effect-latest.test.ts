import assert from 'node:assert/strict'
import test from 'node:test'
import { latestEligibleEffect } from './resolve-effect-latest.ts'

test('latestEligibleEffect selects latest 4.x at least 24 hours old', () => {
  const now = new Date('2026-10-19T03:00:00.000Z')
  assert.equal(latestEligibleEffect({
    '4.0.6': '2026-10-17T00:00:00.000Z',
    '4.0.7': '2026-10-18T00:00:00.000Z',
    '4.1.0': '2026-10-19T00:00:00.000Z',
    '3.99.0': '2026-10-16T00:00:00.000Z',
  }, now), '4.0.7')
})
