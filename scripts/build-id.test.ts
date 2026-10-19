import assert from 'node:assert/strict'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'
import { createGalleryBuildFixture } from '../e2e/helpers/build.ts'

test('build IDs track source inputs and explicit overrides', async () => {
  const fixture = await createGalleryBuildFixture()
  try {
    const galleryPage = resolve(fixture.pagesDir, 'cards.ts')
    const themeCard = resolve(fixture.packagesDir, 'themes/src/components/card.ts')
    const output = resolve(fixture.rootDir, 'build-id-output')
    const first = resolve(output, 'unchanged-first')
    const second = resolve(output, 'unchanged-second')
    fixture.build({ outDir: first })
    const initialId = (JSON.parse(await readFile(resolve(first, 'version.json'), 'utf8')) as { buildId: string }).buildId
    const framework = (await readdir(resolve(first, 'assets')))
      .find((name) => name.startsWith('framework-') && name.endsWith('.js'))
    assert.ok(framework)
    assert.match(await readFile(resolve(first, 'assets', framework), 'utf8'), new RegExp(initialId))
    fixture.build({ outDir: second })
    assert.equal((JSON.parse(await readFile(resolve(second, 'version.json'), 'utf8')) as { buildId: string }).buildId, initialId)

    const originalGalleryPage = await readFile(galleryPage)
    try {
      await writeFile(galleryPage, Buffer.concat([originalGalleryPage, Buffer.from(' ')]))
      const changedGallery = resolve(output, 'changed-gallery')
      fixture.build({ outDir: changedGallery })
      assert.notEqual((JSON.parse(await readFile(resolve(changedGallery, 'version.json'), 'utf8')) as { buildId: string }).buildId, initialId)
    } finally {
      await writeFile(galleryPage, originalGalleryPage)
    }

    const originalThemeCard = await readFile(themeCard)
    try {
      await writeFile(themeCard, Buffer.concat([originalThemeCard, Buffer.from(' ')]))
      const changedTheme = resolve(output, 'changed-theme')
      fixture.build({ outDir: changedTheme })
      assert.notEqual((JSON.parse(await readFile(resolve(changedTheme, 'version.json'), 'utf8')) as { buildId: string }).buildId, initialId)
    } finally {
      await writeFile(themeCard, originalThemeCard)
    }

    const override = resolve(output, 'override')
    fixture.build({ outDir: override, buildId: '0123abcd' })
    assert.equal((JSON.parse(await readFile(resolve(override, 'version.json'), 'utf8')) as { buildId: string }).buildId, '0123abcd')
    assert.throws(() => fixture.build({ outDir: resolve(output, 'invalid-override'), buildId: 'XYZ' }))
  } finally {
    await fixture.cleanup()
  }
})
