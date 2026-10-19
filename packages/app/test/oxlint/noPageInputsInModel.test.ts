import { describe, expect, it } from 'vitest'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runOxlint } from './runOxlint.js'

const fixtures = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures/page-inputs')
const rule = 'wseffect/no-page-inputs-in-model'

describe('no-page-inputs-in-model', () => {
  it('reports PageInputs copied into Messages from event handlers', () => {
    const diagnostics = runOxlint(resolve(fixtures, 'src/pages/bad.ts'), rule)
    expect(diagnostics).toHaveLength(4)
    expect(diagnostics.map((diagnostic) => diagnostic.ruleId)).toEqual([rule, rule, rule, rule])
  })

  it('allows rendering PageInputs as text', () => {
    const diagnostics = runOxlint(resolve(fixtures, 'src/pages/good.ts'), rule)
    expect(diagnostics).toHaveLength(0)
  })
})
