import { expect, test } from '@playwright/test'
import type { BrowserContext } from '@playwright/test'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { GalleryBuildFixture } from './helpers/build.ts'
import { createGalleryBuildFixture } from './helpers/build.ts'
import type { ServerHandle } from '../tools/serve/server.ts'
import { startStaticServer } from './helpers/server.ts'

function build(fixture: GalleryBuildFixture, directory: string, buildId?: string): void {
  fixture.build({ outDir: directory, ...(buildId === undefined ? {} : { buildId }) })
}

async function buildId(directory: string): Promise<string> {
  const version = JSON.parse(await readFile(resolve(directory, 'version.json'), 'utf8')) as { buildId: string }
  return version.buildId
}

async function changeOneByte(path: string): Promise<Buffer> {
  const original = await readFile(path)
  await writeFile(path, Buffer.concat([original, Buffer.from(' ')]))
  return original
}

test('build IDs track source inputs, match the framework chunk, and render at runtime', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'build fixture is isolated; run once')
  const fixture = await createGalleryBuildFixture()
  let context: BrowserContext | undefined
  let server: ServerHandle | undefined
  try {
    const copiedGalleryPage = resolve(fixture.pagesDir, 'cards.ts')
    const copiedThemeCard = resolve(fixture.packagesDir, 'themes/src/components/card.ts')
    const output = resolve(fixture.rootDir, 'build-id-output')
    const first = resolve(output, 'unchanged-first')
    const second = resolve(output, 'unchanged-second')
    build(fixture, first)
    const initialId = await buildId(first)
    const assets = await readdir(resolve(first, 'assets'))
    const framework = assets.find((name) => name.startsWith('framework-') && name.endsWith('.js'))
    if (framework === undefined) throw new Error('framework JavaScript was not emitted')
    expect(await readFile(resolve(first, 'assets', framework), 'utf8')).toContain(initialId)
    const started = await startStaticServer(first)
    server = started.server
    context = await browser.newContext({ baseURL: `http://127.0.0.1:${started.port}` })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.locator('#build-id')).toHaveText(initialId)

    build(fixture, second)
    expect(await buildId(second)).toBe(initialId)

    const originalGalleryPage = await changeOneByte(copiedGalleryPage)
    const changedGallery = resolve(output, 'changed-gallery')
    build(fixture, changedGallery)
    expect(await buildId(changedGallery)).not.toBe(initialId)
    await writeFile(copiedGalleryPage, originalGalleryPage)

    const originalThemeCard = await changeOneByte(copiedThemeCard)
    const changedTheme = resolve(output, 'changed-theme')
    build(fixture, changedTheme)
    expect(await buildId(changedTheme)).not.toBe(initialId)
    await writeFile(copiedThemeCard, originalThemeCard)

    const override = resolve(output, 'override')
    build(fixture, override, '0123abcd')
    expect(await buildId(override)).toBe('0123abcd')

    expect(() => build(fixture, resolve(output, 'invalid-override'), 'XYZ')).toThrow()

  } finally {
    await context?.close()
    await server?.close()
    await fixture.cleanup()
  }
})
