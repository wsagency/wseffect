import assert from 'node:assert/strict'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'
import { createScratchDir } from '../e2e/helpers/build.ts'
import { checkGalleryEffectSourceMaps } from './check-repo.ts'

test('gallery source maps reference exactly one Effect package directory', async () => {
  const root = await createScratchDir('wseffect-source-map-')
  const assets = resolve(root, 'apps/gallery/dist/assets')
  try {
    await mkdir(assets, { recursive: true })
    await writeFile(resolve(assets, 'index-1.js.map'), JSON.stringify({ sources: ['../../../../node_modules/.pnpm/effect@4.0.7/node_modules/effect/dist/Effect.js'] }))
    assert.deepEqual(await checkGalleryEffectSourceMaps(root), [])
    await writeFile(resolve(assets, 'framework-2.js.map'), JSON.stringify({ sources: ['../../../../node_modules/.pnpm/effect@4.0.7/node_modules/effect/dist/Schema.js'] }))
    assert.deepEqual(await checkGalleryEffectSourceMaps(root), [])
    await writeFile(resolve(assets, 'framework-2.js.map'), JSON.stringify({ sources: ['../../../../node_modules/.pnpm/effect@4.0.7/node_modules/effect/dist/Schema.js', '../../../../other/node_modules/effect/dist/Effect.js'] }))
    assert.match((await checkGalleryEffectSourceMaps(root)).join('\n'), /2 Effect package directories/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
