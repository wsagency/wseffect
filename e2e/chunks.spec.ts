import { expect, test } from '@playwright/test'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { ServerHandle } from '../tools/serve/server.ts'
import { createGalleryBuildFixture } from './helpers/build.ts'
import { startStaticServer } from './helpers/server.ts'


async function assetNames(directory: string): Promise<ReadonlyArray<string>> {
  return (await readdir(resolve(directory, 'assets'))).sort()
}

test('fixed build IDs preserve every asset name except the changed page chunk', async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'build fixture mutates an isolated gallery copy; run once')
  const fixture = await createGalleryBuildFixture()
  const tabsPath = resolve(fixture.pagesDir, 'tabs.ts')
  const first = resolve(fixture.rootDir, 'builds/first')
  const second = resolve(fixture.rootDir, 'builds/second')
  let server: ServerHandle | undefined
  try {
    const source = (await readFile(tabsPath)).toString()
    fixture.build({ outDir: first, buildId: 'd3a1234' })
    const changedSource = source.replace("'Overview content'", "'Overview content changed'")
    expect(changedSource).not.toBe(source)
    await writeFile(tabsPath, changedSource)
    fixture.build({ outDir: second, buildId: 'd3a1234' })
    const before = new Set(await assetNames(first))
    const after = new Set(await assetNames(second))
    const removed = [...before].filter((name) => !after.has(name))
    const added = [...after].filter((name) => !before.has(name))
    expect(removed).toHaveLength(1)
    expect(added).toHaveLength(1)
    expect(removed[0]).toMatch(/^tabs-[^/]+\.js$/)
    expect(added[0]).toMatch(/^tabs-[^/]+\.js$/)

    const started = await startStaticServer(second)
    server = started.server
    const response = await fetch(`http://127.0.0.1:${started.port}/`)
    expect(response.status).toBe(200)
  } finally {
    await server?.close()
    await fixture.cleanup()
  }
})


