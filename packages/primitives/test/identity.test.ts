import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const packageRoot = resolve(import.meta.dirname, '..')

describe('primitive view identity', () => {
  it('build brands exported views at the library boundary', async () => {
    const buildScript = await readFile(resolve(packageRoot, 'scripts/brand-dist.mjs'), 'utf8')
    const source = await readFile(resolve(packageRoot, 'src/checkbox-group.ts'), 'utf8')
    const output = await readFile(resolve(packageRoot, 'dist/checkbox-group.js'), 'utf8')
    expect(buildScript).toContain('brandDistDirectory(packageRoot,')
    expect(source).not.toContain('@wsagency/wseffect-foldkit/brand')
    expect(output).toContain('@wsagency/wseffect-foldkit/brand')
    expect(output).toContain('brandViewResult')
  })
})
