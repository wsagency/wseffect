import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

describe('package distribution contract', () => {
  it('exports only the four supported package entrypoints and the codegen command', async () => {
    const manifest = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8')) as {
      exports: Record<string, unknown>
      bin: Record<string, string>
    }
    expect(Object.keys(manifest.exports)).toEqual(['.', './vite', './codegen', './oxlint-plugin'])
    expect(manifest.bin['wseffect-codegen']).toBe('./dist/codegen/bin.js')
  })

  it('brands every emitted runtime view from Foldkit after TypeScript compilation', async () => {
    const source = await readFile(resolve(packageRoot, 'scripts/brand-dist.mjs'), 'utf8')
    expect(source).toContain("brandDistDirectory(packageRoot, '@wsagency/wseffect-app')")
    expect(JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8')).scripts.build)
      .toContain('node scripts/brand-dist.mjs')
  })
  it('publishes the standalone page and app helpers from the package root', async () => {
    const app = await import('../dist/index.js')
    for (const name of [
      'slotsSchema',
      'messageSchema',
      'loaderSubscriptions',
      'activate',
      'foldPage',
      'viewPage',
      'prefetchOnIntent',
      'prefetchOnVisible',
      'makeApp',
      'ServiceWorker',
    ]) {
      expect(app).toHaveProperty(name)
    }
  })
})
