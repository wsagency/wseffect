import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateManifest } from '@wsagency/wseffect-app/vite'
import { manifest } from '../vite.config.js'

describe('gallery manifest', () => {
  it('satisfies the PWA manifest contract', () => {
    expect(validateManifest(manifest)).toEqual([])
  })

  it('loads the pre-SP2 aggregate as its eager component CSS', async () => {
    const source = await readFile(resolve(import.meta.dirname, '../src/main.ts'), 'utf8')
    expect(source).toContain("import '@wsagency/wseffect-themes/components-base.css'")
    expect(source).not.toContain("import '@wsagency/wseffect-themes/components.css'")
  })
  it('keeps the multi-thumb Gallery slider on its isolated lazy theme subpath', async () => {
    const source = await readFile(resolve(import.meta.dirname, '../src/components/rangeSlider.ts'), 'utf8')
    const rangeSource = await readFile(resolve(import.meta.dirname, '../../../packages/themes/src/components/slider/range.ts'), 'utf8')
    expect(source).toContain("import { Range as SliderRange } from '@wsagency/wseffect-themes/components/slider/range'")
    expect(source).not.toContain("from '@wsagency/wseffect-themes/components/slider'")
    expect(rangeSource).not.toContain("from '@foldkit/ui/slider'")
  })
  it('keeps capture renderers out of regular family chunks', async () => {
    const manifest = JSON.parse(await readFile(resolve(import.meta.dirname, '../dist/.vite/manifest.json'), 'utf8')) as Record<string, {
      imports?: ReadonlyArray<string>
      dynamicImports?: ReadonlyArray<string>
    }>
    const captureEntry = manifest['src/capture.ts']
    expect(captureEntry).toBeDefined()
    const captureChunks = Object.keys(manifest).filter((key) => /^src\/components\/[^/]+\.capture\.ts$/.test(key))
    expect(captureChunks.length).toBeGreaterThan(0)
    expect(captureEntry?.dynamicImports).toEqual(expect.arrayContaining(captureChunks))
    for (const [key, chunk] of Object.entries(manifest)) {
      if (!/^src\/components\/[^/]+\.ts$/.test(key)) continue
      for (const captureChunk of captureChunks) {
        expect([...(chunk.imports ?? []), ...(chunk.dynamicImports ?? [])]).not.toContain(captureChunk)
      }
    }
  })
})
