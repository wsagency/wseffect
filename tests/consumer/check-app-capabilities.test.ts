import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { APP_CAPABILITIES, checkAppCapabilityModules, effectModulesFromSourceMap } from '../../tools/gates/app-capabilities.ts'
import { createScratchDir } from '../../e2e/helpers/build.ts'
import { checkPackedAppCapabilities, exportedNamesFromTypes } from './check-app-capabilities.ts'

async function writeAppPackage(root: string, declaration: string): Promise<string> {
  const appRoot = join(root, 'node_modules/@wsagency/wseffect-app')
  await mkdir(join(appRoot, 'dist'), { recursive: true })
  await writeFile(join(appRoot, 'package.json'), JSON.stringify({
    sideEffects: false,
    exports: { '.': { types: './dist/index.d.ts', default: './dist/index.js' } },
  }))
  await writeFile(join(appRoot, 'dist/index.d.ts'), declaration)
  return appRoot
}

async function sourceMapSourcesForFixture(fixture: string): Promise<string[]> {
  const dist = join(fixture, 'dist')
  const manifest = JSON.parse(await readFile(join(dist, '.vite/manifest.json'), 'utf8')) as Record<string, { file: string }>
  const sources: string[] = []
  for (const { file } of Object.values(manifest)) {
    if (!file.endsWith('.js')) continue
    const sourceMap = JSON.parse(await readFile(join(dist, `${file}.map`), 'utf8')) as { sources?: string[] }
    sources.push(...(sourceMap.sources ?? []))
  }
  return sources
}

test('export-star declarations build a Foldkit helper fixture against the shared baseline', async () => {
  const root = await createScratchDir('wseffect-app-export-star-')
  try {
    const appRoot = await writeAppPackage(root, "export * from './signals.js'\nexport * from './serviceWorker.js'\nexport type { SignalOutcome as Outcome } from './outcomes.js'\n")
    await writeFile(join(appRoot, 'dist/index.js'), "export * from './signals.js'\nexport * from './serviceWorker.js'\n")
    await writeFile(join(appRoot, 'dist/signals.d.ts'), 'export declare function signalSubscription(): void\n')
    await writeFile(join(appRoot, 'dist/signals.js'), "import { Effect } from 'effect'\nexport function signalSubscription() { return Effect.succeed(undefined) }\n")
    await writeFile(join(appRoot, 'dist/serviceWorker.d.ts'), 'export declare function registerServiceWorker(): void\n')
    await writeFile(join(appRoot, 'dist/serviceWorker.js'), "import { registerSW } from 'virtual:pwa-register'\nexport function registerServiceWorker() { return registerSW() }\n")
    const repoRoot = resolve(import.meta.dirname, '../..')
    await symlink(join(repoRoot, 'apps/gallery/node_modules/effect'), join(root, 'node_modules/effect'), 'dir')
    await mkdir(join(root, 'node_modules/@wsagency'), { recursive: true })
    await symlink(join(repoRoot, 'packages/foldkit'), join(root, 'node_modules/@wsagency/wseffect-foldkit'), 'dir')
    const names = await exportedNamesFromTypes(join(appRoot, 'dist/index.d.ts'))
    assert.deepEqual([...names].sort(), ['Outcome', 'registerServiceWorker', 'signalSubscription'])

    const fixtures = join(import.meta.dirname, 'fixtures/app-capabilities')

    await checkPackedAppCapabilities({ consumerRoot: root, fixturesDirectory: fixtures })
    const baselineSources = await sourceMapSourcesForFixture(join(root, '.app-capability-baseline'))
    const helperSources = await sourceMapSourcesForFixture(join(root, '.app-capability-signals-modules'))
    const baselineModules = effectModulesFromSourceMap(baselineSources)
    const helperModules = effectModulesFromSourceMap(helperSources)
    assert.ok(baselineModules.includes('Effect.js'), 'B must already contain Effect.js')
    assert.ok(helperModules.includes('Effect.js'), 'B+H must also contain Effect.js')
    assert.ok(helperSources.some((source) => source.replaceAll('\\', '/').endsWith('/dist/signals.js')), 'B+H must include H')
    assert.deepEqual(checkAppCapabilityModules({ helper: 'signals', modules: helperModules, baseline: baselineModules }), { ok: true, unexpected: [] })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('requireAll fails when the local consumer is missing exactly one helper export', async () => {
  const root = await createScratchDir('wseffect-app-required-export-')
  try {
    const missingExport = APP_CAPABILITIES[0]!.exports[0]!
    const exports = APP_CAPABILITIES.flatMap(({ exports: names }) => names).filter((name) => name !== missingExport)
    const appRoot = await writeAppPackage(root, "export * from './exports.js'\n")
    await writeFile(join(appRoot, 'dist/exports.d.ts'), exports.map((name) => `export declare const ${name}: unknown`).join('\n'))
    await assert.rejects(
      checkPackedAppCapabilities({ consumerRoot: root, fixturesDirectory: join(root, 'fixtures'), requireAll: true }),
      (error) => {
        const message = error instanceof Error ? error.message : String(error)
        assert.match(message, new RegExp(`${APP_CAPABILITIES[0]!.helper}: ${missingExport}.*helper not exported yet`))
        assert.equal(message.match(/helper not exported yet/g)?.length, 1)
        return true
      },
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
