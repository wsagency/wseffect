import { describe, expect, it } from 'vitest'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runOxlint } from './runOxlint.js'

const fixtures = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures/pages-side-effects')
const rule = 'wseffect/no-top-level-side-effects-in-pages'

describe('no-top-level-side-effects-in-pages', () => {
  it('reports top-level calls and timer initializers in pages', () => {
    const diagnostics = runOxlint(fixtures, rule)
    expect(diagnostics).toHaveLength(2)
    expect(diagnostics.map((diagnostic) => diagnostic.ruleId)).toEqual([rule, rule])
  })

  it('allows the default initializer calls', () => {
    const diagnostics = runOxlint(resolve(fixtures, 'src/pages/good.ts'), rule)
    expect(diagnostics).toHaveLength(0)
  })

  it('ignores equivalent calls outside src/pages', () => {
    const diagnostics = runOxlint(resolve(fixtures, 'src/other.ts'), rule)
    expect(diagnostics).toHaveLength(0)
  })
})
