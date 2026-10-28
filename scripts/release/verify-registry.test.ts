import assert from 'node:assert/strict'
import test from 'node:test'
import { verifyRegistry, type RegistryRecord } from './verify-registry.ts'

const packages = ['@wsagency/wseffect-app', '@wsagency/wseffect-themes', '@wsagency/wseffect-foldkit', '@wsagency/wseffect-foldkit-ui', '@wsagency/wseffect-vite-plugin']
const records = (): Record<string, RegistryRecord> => Object.fromEntries(packages.map((name) => [name, { version: '1.2.3', integrity: 'sha512-good', tags: { next: '1.2.3', latest: '1.2.3' } }]))

test('registry verification confirms exact versions, integrity and next/latest tags', async () => {
  const result = await verifyRegistry({ version: '1.2.3', expected: records() }, {
    view: async (name) => records()[name]!,
    sleep: async () => {},
  })
  assert.equal(result.ok, true, result.errors.join('\n'))
})

test('registry verification retries propagation delay within a bounded attempt count', async () => {
  let calls = 0
  const result = await verifyRegistry({ version: '1.2.3', expected: records(), attempts: 3, delayMs: 0 }, {
    view: async (name) => {
      calls++
      if (calls <= packages.length) throw new Error('not published yet')
      return records()[name]!
    },
    sleep: async () => {},
  })
  assert.equal(result.ok, true, result.errors.join('\n'))
  assert.equal(calls, packages.length * 2)
})

test('registry verification rejects wrong latest tag and integrity rather than trusting publish output', async () => {
  const wrong = records()
  wrong[packages[0]!]!.tags.latest = '0.9.0'
  wrong[packages[1]!]!.integrity = 'sha512-wrong'
  const result = await verifyRegistry({ version: '1.2.3', expected: wrong }, {
    view: async () => ({ version: '1.2.3', integrity: 'sha512-good', tags: { next: '1.2.3', latest: '0.9.0' } }),
    sleep: async () => {},
  })
  assert.equal(result.ok, false)
  assert.match(result.errors.join('\n'), /latest/)
  assert.match(result.errors.join('\n'), /integrity/)
})
