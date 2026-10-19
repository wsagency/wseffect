import { expect, test } from '@playwright/test'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { ServerHandle } from '../tools/serve/server.ts'
import { createGalleryBuildFixture } from './helpers/build.ts'
import { startStaticServer } from './helpers/server.ts'


async function assetNames(directory: string): Promise<ReadonlyArray<string>> {
  return (await readdir(resolve(directory, 'assets'))).sort()
}

test('fixed build IDs rename only the entry and changed page, leaving app-shared and other pages stable', async ({}, testInfo) => {
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
    expect(removed).toHaveLength(2)
    expect(added).toHaveLength(2)
    expect(removed.map((name) => name.split('-')[0]).sort()).toEqual(['index', 'tabs'])
    expect(added.map((name) => name.split('-')[0]).sort()).toEqual(['index', 'tabs'])

    const oldEntry = removed.find((name) => /^index-[^/]+\.js$/.test(name))
    const newEntry = added.find((name) => /^index-[^/]+\.js$/.test(name))
    const oldTabs = removed.find((name) => /^tabs-[^/]+\.js$/.test(name))
    const newTabs = added.find((name) => /^tabs-[^/]+\.js$/.test(name))
    const appShared = [...before].find((name) => name.startsWith('app-shared-'))
    expect(oldEntry).toBeDefined()
    expect(newEntry).toBeDefined()
    expect(oldTabs).toBeDefined()
    expect(newTabs).toBeDefined()
    expect(newEntry).not.toBe(oldEntry)
    expect(appShared).toBeDefined()
    expect(after.has(appShared!)).toBe(true)
    expect(await readFile(resolve(first, 'assets', appShared!))).toEqual(await readFile(resolve(second, 'assets', appShared!)))
    const secondEntry = await readFile(resolve(second, 'assets', newEntry!), 'utf8')
    expect(secondEntry).toContain(newTabs!)
    expect(secondEntry).not.toContain(oldTabs!)
    expect([...before].filter((name) => !name.startsWith('index-') && !name.startsWith('tabs-')))
      .toEqual([...after].filter((name) => !name.startsWith('index-') && !name.startsWith('tabs-')))

    const started = await startStaticServer(second)
    server = started.server
    const response = await fetch(`http://127.0.0.1:${started.port}/`)
    expect(response.status).toBe(200)
  } finally {
    await server?.close()
    await fixture.cleanup()
  }
})


