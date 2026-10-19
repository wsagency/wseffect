import { expect, test } from '@playwright/test'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const repository = resolve(import.meta.dirname, '..')
const gallery = resolve(repository, 'apps/gallery')
const galleryPage = resolve(gallery, 'src/pages/cards.ts')
const themeCard = resolve(repository, 'packages/themes/src/components/card.ts')

async function cacheScratch(): Promise<string> {
  const home = process.env.HOME
  if (home === undefined) throw new Error('HOME is required to place E2E scratch under ~/.cache')
  const cache = resolve(home, '.cache')
  await mkdir(cache, { recursive: true })
  return mkdtemp(resolve(cache, 'wseffect-e2e-build-id-'))
}

function build(directory: string, env: NodeJS.ProcessEnv = process.env): void {
  execFileSync('pnpm', ['--dir', gallery, 'exec', 'vite', 'build', '--outDir', directory, '--emptyOutDir'], {
    cwd: repository,
    stdio: 'pipe',
    env,
  })
}

async function buildId(directory: string): Promise<string> {
  const version = JSON.parse(await readFile(resolve(directory, 'version.json'), 'utf8')) as { buildId: string }
  return version.buildId
}

async function changeOneByte(path: string, original: Buffer): Promise<void> {
  await writeFile(path, Buffer.concat([original, Buffer.from(' ')]))
}

test('build IDs track gallery and workspace source inputs and match the entry JavaScript', async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'build fixture mutates shared source files; run once')
  const scratch = await cacheScratch()
  const originalGalleryPage = await readFile(galleryPage)
  const originalThemeCard = await readFile(themeCard)
  try {
    const plainEnv = { ...process.env, WSEFFECT_BUILD_ID: undefined }
    const first = resolve(scratch, 'unchanged-first')
    const second = resolve(scratch, 'unchanged-second')
    build(first, plainEnv)
    build(second, plainEnv)
    const initialId = await buildId(first)
    expect(await buildId(second)).toBe(initialId)

    await changeOneByte(galleryPage, originalGalleryPage)
    const changedGallery = resolve(scratch, 'changed-gallery')
    build(changedGallery, plainEnv)
    expect(await buildId(changedGallery)).not.toBe(initialId)
    await writeFile(galleryPage, originalGalleryPage)

    await changeOneByte(themeCard, originalThemeCard)
    const changedTheme = resolve(scratch, 'changed-theme')
    build(changedTheme, plainEnv)
    expect(await buildId(changedTheme)).not.toBe(initialId)
    await writeFile(themeCard, originalThemeCard)

    const override = resolve(scratch, 'override')
    build(override, { ...plainEnv, WSEFFECT_BUILD_ID: '0123abcd' })
    expect(await buildId(override)).toBe('0123abcd')

    expect(() => build(resolve(scratch, 'invalid-override'), { ...plainEnv, WSEFFECT_BUILD_ID: 'XYZ' }))
      .toThrow()

    const versionId = await buildId(first)
    const assets = await readdir(resolve(first, 'assets'))
    const entry = assets.find((name) => name.startsWith('index-') && name.endsWith('.js'))
    if (entry === undefined) throw new Error('entry JavaScript was not emitted')
    expect(await readFile(resolve(first, 'assets', entry), 'utf8')).toContain(versionId)
  } finally {
    await writeFile(galleryPage, originalGalleryPage)
    await writeFile(themeCard, originalThemeCard)
    await rm(scratch, { recursive: true, force: true })
  }
})
