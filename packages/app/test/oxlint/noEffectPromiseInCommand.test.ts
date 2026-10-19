import { describe, expect, it } from 'vitest'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runOxlint } from './runOxlint.js'

const fixtures = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures/no-effect-promise')

describe('no-effect-promise-in-command', () => {
  it('reports Effect.promise only in Command modules', () => {
    const diagnostics = runOxlint(fixtures, 'wseffect/no-effect-promise-in-command')
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]?.file).toMatch(/bad\.ts$/)
    expect(diagnostics[0]?.ruleId).toBe('wseffect/no-effect-promise-in-command')
  })
})
