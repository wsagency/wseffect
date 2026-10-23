import assert from 'node:assert/strict'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'
import { createGalleryBuildFixture } from '../e2e/helpers/build.ts'

async function assetNames(directory: string): Promise<ReadonlyArray<string>> {
  return (await readdir(resolve(directory, 'assets'))).filter((name) => name.endsWith('.js')).sort()
}

test('fixed build IDs rename the entry and changed family page while capture chunks stay lazy', async () => {
  const fixture = await createGalleryBuildFixture()
  const dataTablePath = resolve(fixture.galleryDir, 'src/pages/dataTable.ts')
  const first = resolve(fixture.rootDir, 'builds/first')
  const second = resolve(fixture.rootDir, 'builds/second')
  try {
    const source = (await readFile(dataTablePath)).toString()
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
    assert.equal(
      eagerMaps.some((sourceMap) => sourceMap.sources.some((source) => source.endsWith('packages/themes/dist/breakpoints.js'))),
      false,
      'the shared breakpoint tokens must stay out of the eager closure when used only by the lazy browser page',
    )
    assert.equal(eagerSourceMaps.length > 0, true)
    assert.equal(
      eagerNames.some((name) => /^(?:signalSubscription|projectConstraintValidity|persist|breakpointSubscription|makeLocale|clipboardCommand|scrollIntoViewCommand|resizeObserverMount|Island)$/.test(name)),
      false,
      'the initial HTML, framework and app-shared module closure must not contain lazy capability helpers',
    )
    const changedSource = source.replace('rowHeight = 36,', 'rowHeight = 37,')
    assert.notEqual(changedSource, source)
    await writeFile(dataTablePath, changedSource)
    fixture.build({ outDir: second, buildId: 'd3a1234' })
    const before = new Set(await assetNames(first))
    const after = new Set(await assetNames(second))
    const removed = [...before].filter((name) => !after.has(name))
    const added = [...after].filter((name) => !before.has(name))
    assert.deepEqual(removed.map((name) => name.split('-')[0]).sort(), ['dataTable', 'index'])
    assert.deepEqual(added.map((name) => name.split('-')[0]).sort(), ['dataTable', 'index'])
    const oldEntry = removed.find((name) => /^index-[^/]+\.js$/.test(name))
    const newEntry = added.find((name) => /^index-[^/]+\.js$/.test(name))
    const oldDataTable = removed.find((name) => /^dataTable-[^/]+\.js$/.test(name))
    const newDataTable = added.find((name) => /^dataTable-[^/]+\.js$/.test(name))
    const appShared = [...before].find((name) => name.startsWith('app-shared-'))
    const componentIndex = [...before].find((name) => /^components-[^/]+\.js$/.test(name))
    assert.ok(oldEntry && newEntry && oldDataTable && newDataTable && appShared && componentIndex)
    assert.equal(after.has(appShared), true)
    assert.deepEqual(await readFile(resolve(first, 'assets', appShared)), await readFile(resolve(second, 'assets', appShared)))
    assert.equal(after.has(componentIndex), true)
    assert.equal((await readFile(resolve(first, 'assets', componentIndex))).equals(await readFile(resolve(second, 'assets', componentIndex))), true)
    assert.equal((await readFile(resolve(second, 'assets', newEntry), 'utf8')).includes(newDataTable), true)
    assert.equal((await readFile(resolve(second, 'assets', newEntry), 'utf8')).includes(oldDataTable), false)
    const captureAssets = [...before].filter((name) => name.includes('capture'))
    assert.deepEqual([...after].filter((name) => name.includes('capture')), captureAssets)
    for (const asset of captureAssets) {
      assert.deepEqual(await readFile(resolve(first, 'assets', asset)), await readFile(resolve(second, 'assets', asset)))
    }
    assert.deepEqual(
      [...before].filter((name) => !name.startsWith('index-') && !name.startsWith('dataTable-') && !name.startsWith('capture-')),
      [...after].filter((name) => !name.startsWith('index-') && !name.startsWith('dataTable-') && !name.startsWith('capture-')),
    )
  } finally {
    await fixture.cleanup()
  }
})
