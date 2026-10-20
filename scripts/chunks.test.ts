import assert from 'node:assert/strict'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'
import { createGalleryBuildFixture } from '../e2e/helpers/build.ts'

async function assetNames(directory: string): Promise<ReadonlyArray<string>> {
  return (await readdir(resolve(directory, 'assets'))).filter((name) => name.endsWith('.js')).sort()
}

test('fixed build IDs rename only the entry and changed page, leaving app-shared and other pages stable', async () => {
  const fixture = await createGalleryBuildFixture()
  const tabsPath = resolve(fixture.pagesDir, 'tabs.ts')
  const first = resolve(fixture.rootDir, 'builds/first')
  const second = resolve(fixture.rootDir, 'builds/second')
  try {
    const source = (await readFile(tabsPath)).toString()
    fixture.build({ outDir: first, buildId: 'd3a1234' })
    const initialAssets = resolve(first, 'assets')
    const eagerSourceMaps = (await readdir(initialAssets))
      .filter((name) => /^(?:index|framework|app-shared)-.*\.js\.map$/.test(name))
    const eagerMaps = await Promise.all(eagerSourceMaps.map(async (name) =>
      JSON.parse(await readFile(resolve(initialAssets, name), 'utf8')) as {
        sources: ReadonlyArray<string>
        names: ReadonlyArray<string>
      },
    ))
    const eagerNames = eagerMaps.flatMap((sourceMap) => sourceMap.names)
    assert.equal(eagerSourceMaps.length > 0, true)
    assert.equal(
      eagerNames.some((name) => /^(?:signalSubscription|projectConstraintValidity|persist|breakpointSubscription|makeLocale|clipboardCommand|scrollIntoViewCommand|resizeObserverMount|Island)$/.test(name)),
      false,
      'the initial HTML, framework and app-shared module closure must not contain lazy capability helpers',
    )
    const changedSource = source.replace("'Overview panel.'", "'Overview panel changed.'")
    assert.notEqual(changedSource, source)
    await writeFile(tabsPath, changedSource)
    fixture.build({ outDir: second, buildId: 'd3a1234' })
    const before = new Set(await assetNames(first))
    const after = new Set(await assetNames(second))
    const removed = [...before].filter((name) => !after.has(name))
    const added = [...after].filter((name) => !before.has(name))
    assert.deepEqual(removed.map((name) => name.split('-')[0]).sort(), ['index', 'tabs'])
    assert.deepEqual(added.map((name) => name.split('-')[0]).sort(), ['index', 'tabs'])
    const oldEntry = removed.find((name) => /^index-[^/]+\.js$/.test(name))
    const newEntry = added.find((name) => /^index-[^/]+\.js$/.test(name))
    const oldTabs = removed.find((name) => /^tabs-[^/]+\.js$/.test(name))
    const newTabs = added.find((name) => /^tabs-[^/]+\.js$/.test(name))
    const appShared = [...before].find((name) => name.startsWith('app-shared-'))
    assert.ok(oldEntry && newEntry && oldTabs && newTabs && appShared)
    assert.equal(after.has(appShared), true)
    assert.deepEqual(await readFile(resolve(first, 'assets', appShared)), await readFile(resolve(second, 'assets', appShared)))
    assert.equal((await readFile(resolve(second, 'assets', newEntry), 'utf8')).includes(newTabs), true)
    assert.equal((await readFile(resolve(second, 'assets', newEntry), 'utf8')).includes(oldTabs), false)
    assert.deepEqual(
      [...before].filter((name) => !name.startsWith('index-') && !name.startsWith('tabs-')),
      [...after].filter((name) => !name.startsWith('index-') && !name.startsWith('tabs-')),
    )
  } finally {
    await fixture.cleanup()
  }
})
