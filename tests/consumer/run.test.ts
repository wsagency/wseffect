import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'node:net'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { findFreePreviewPort, findNewTarballName, packageDirectory, packedBuildEnvironment, runWithPreviewPortRetry } from './run.ts'
import { checkBranding } from './check-branding.ts'
import { checkCoverageManifest } from './check-coverage-manifest.ts'
import { checkTreeShaking } from './check-tree-shaking.ts'
import { discoverPackagePublicSurface, discoverPublicItems, extractExportNames } from './discover-public-surface.ts'
import { createScratchDir } from '../../e2e/helpers/build.ts'
import { checkUp8 } from './check-up8.ts'
const readme = '<!-- up8:start -->\n```yaml\nthe exact block\n```\n<!-- up8:end -->'
const workspace = 'the exact block\n'
test('packed consumer preview port is available to bind', async () => {
  const port = await findFreePreviewPort()
  const server = createServer()
  const listening = Promise.withResolvers<void>()
  server.once('error', listening.reject)
  server.listen(port, '127.0.0.1', listening.resolve)
  await listening.promise
  const closed = Promise.withResolvers<void>()
  server.close((error) => error ? closed.reject(error) : closed.resolve())
  await closed.promise
})
test('packed consumer retries an occupied preview port with a new one', async () => {
  const collision = Object.assign(new Error('preview startup failed'), { stderr: Buffer.from('Error: Port 4450 is already in use') })
  const attempts: number[] = []
  await runWithPreviewPortRetry((port) => {
    attempts.push(port)
    if (attempts.length === 1) throw collision
  }, '4450')
  assert.deepEqual(attempts.length, 2)
  assert.equal(attempts[0], 4450)
  assert.notEqual(attempts[1], 4450)
})

test('packed consumer stops preview retries after three collisions', async () => {
  const collision = Object.assign(new Error('listen failed'), { stderr: Buffer.from('EADDRINUSE') })
  let attempts = 0
  await assert.rejects(runWithPreviewPortRetry(() => {
    attempts += 1
    throw collision
  }, '4450'), (error) => error === collision)
  assert.equal(attempts, 3)
})
test('packed tarballs are sourced from the matching local package directory', () => {
  assert.equal(packageDirectory('/consumer-workspace', 'app'), resolve('/consumer-workspace/packages/app'))
  assert.equal(packageDirectory('/consumer-workspace', 'primitives'), resolve('/consumer-workspace/packages/primitives'))
  assert.equal(packageDirectory('/consumer-workspace', 'themes'), resolve('/consumer-workspace/packages/themes'))
})
test('tarball discovery ignores files already present before packing', () => {
  assert.equal(findNewTarballName(new Set(['old.tgz', 'note.txt']), ['old.tgz', 'new.tgz']), 'new.tgz')
  assert.equal(findNewTarballName(new Set(['old.tgz']), ['old.tgz']), undefined)
})
test('packed builds use a deterministic build ID and enable the local capability stream', () => {
  const env = packedBuildEnvironment({})
  assert.equal(env.WSEFFECT_BUILD_ID, 'd5c0ffee')
  assert.equal(env.GALLERY_CAPABILITY_SSE, '1')
})

test('UP-8 requires the README block to match byte-for-byte', () => {
  assert.deepEqual(checkUp8(readme, workspace), [])
  assert.notDeepEqual(checkUp8(readme, '\nthe exact blocK\n'), [])
})

test('APP-6 detects each forbidden tree-shaken export marker', () => {
  for (const marker of ['viewPage', 'ServiceWorker', 'makeApp', 'prefetchOnVisible']) {
    assert.notDeepEqual(checkTreeShaking(`consumer bundle contains ${marker}`, marker), [])
    assert.deepEqual(checkTreeShaking('consumer bundle contains makePages loaderSubscriptions', marker), [])
  }
})

test('TEST-7 requires coverage for every public export', () => {
  const manifest = { makePages: 'tree-shaking', loaderSubscriptions: 'tree-shaking' }
  assert.notDeepEqual(checkCoverageManifest(manifest, ['makePages', 'loaderSubscriptions', 'viewPage'], ['tree-shaking']), [])
})
test('REPO-2 checks every exported view adapter and component factory', () => {
  const missingBrand = (name: string) => [{ path: `dist/${name}.js`, source: `export const ${name} = () => {}` }]
  assert.notDeepEqual(checkBranding(missingBrand('viewPage')), [])
  assert.notDeepEqual(checkBranding(missingBrand('embed')), [])
  assert.notDeepEqual(checkBranding([{ path: 'dist/menu.js', source: 'import { defineView } from "foldkit"; export const create = () => defineView(() => {})' }]), [])
  assert.deepEqual(checkBranding([{ path: 'dist/other.js', source: 'export const create = () => ({})' }]), [])
})

test('TEST-7 requires every listed export check to pass', () => {
  const manifest = { makePages: 'tree-shaking' }
  assert.notDeepEqual(checkCoverageManifest(manifest, ['makePages'], []), [])
})
test('TEST-7 expands wildcard CSS entries and lists named runtime and type exports', () => {
  const items = discoverPublicItems(
    '@wsagency/example',
    {
      '.': { default: './dist/index.js', types: './dist/index.d.ts' },
      './vite': { default: './dist/vite/index.js', types: './dist/vite/index.d.ts' },
      './*.css': { default: './dist/styles/*.css', types: './dist/css.d.ts' },
    },
    ['dist/index.js', 'dist/index.d.ts', 'dist/vite/index.js', 'dist/vite/index.d.ts', 'dist/css.d.ts', 'dist/styles/reset.css', 'dist/styles/theme.css'],
    { 'dist/index.js': ['makePages'], 'dist/vite/index.js': ['wseffect'] },
    {
      'dist/index.d.ts': ['PageDefinition'],
      'dist/vite/index.d.ts': ['WseffectOptions', 'ManifestOptions'],
      'dist/css.d.ts': ['default'],
    },
  )
  assert.ok(items.includes('export:@wsagency/example:.:makePages'))
  assert.ok(items.includes('type:@wsagency/example:.:PageDefinition'))
  assert.ok(items.includes('type:@wsagency/example:./vite:WseffectOptions'))
  assert.ok(items.includes('type:@wsagency/example:./vite:ManifestOptions'))
  assert.ok(items.includes('type:@wsagency/example:./reset.css:default'))
  assert.ok(items.includes('type:@wsagency/example:./theme.css:default'))
  assert.ok(items.includes('css:@wsagency/example:dist/styles/reset.css'))
  assert.ok(items.includes('css:@wsagency/example:dist/styles/theme.css'))
  assert.ok(items.includes('subpath:@wsagency/example:./reset.css'))
  assert.deepEqual(extractExportNames('export const view = () => {}; export { create as createMenu }'), ['createMenu', 'view'])
  assert.deepEqual(extractExportNames('export interface WseffectOptions {}; export type PageKey = string'), ['PageKey', 'WseffectOptions'])
  assert.notDeepEqual(checkCoverageManifest({ [items[0]]: 'install' }, items, ['install']), [])
})
test('TEST-7 recursively discovers declaration-only exports', async () => {
  const root = await createScratchDir('wseffect-consumer-types-')
  try {
    await mkdir(resolve(root, 'dist'), { recursive: true })
    await writeFile(resolve(root, 'package.json'), JSON.stringify({
      exports: { '.': { types: './dist/index.d.ts', default: './dist/index.js' } },
    }))
    await writeFile(resolve(root, 'dist/index.js'), `export * from './runtime.js'\n`)
    await writeFile(resolve(root, 'dist/runtime.js'), 'export const runtime = true\n')
    await writeFile(resolve(root, 'dist/index.d.ts'), `export type * from './types.js'\n`)
    await writeFile(resolve(root, 'dist/types.d.ts'), 'export interface ManifestOptions {}\n')
    const items = await discoverPackagePublicSurface(root, '@wsagency/example')
    assert.ok(items.includes('type:@wsagency/example:.:ManifestOptions'))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
test('TEST-7 rejects missing CSS declaration and default targets', () => {
  assert.throws(() => discoverPublicItems(
    '@wsagency/example',
    { './theme.css': { default: './dist/theme.css', types: './dist/css.d.ts' } },
    ['dist/theme.css'],
    {},
  ), /does not resolve to a declaration module/)
  assert.throws(() => discoverPublicItems(
    '@wsagency/example',
    { './missing.css': { default: './dist/missing.css', types: './dist/css.d.ts' } },
    ['dist/theme.css'],
    {},
    { 'dist/css.d.ts': ['default'] },
  ), /does not resolve to a CSS file/)
  assert.throws(() => discoverPublicItems(
    '@wsagency/example',
    { './meta.json': { default: './dist/meta.json', types: './dist/meta.d.ts' } },
    [],
    {},
    { 'dist/meta.d.ts': [] },
  ), /does not resolve to a default target/)
})
test('TEST-7 covers declarations on non-code default targets', () => {
  const items = discoverPublicItems(
    '@wsagency/example',
    { './meta.json': { default: './dist/meta.json', types: './dist/meta.d.ts' } },
    ['dist/meta.json', 'dist/meta.d.ts'],
    {},
    { 'dist/meta.d.ts': ['Metadata'] },
  )
  assert.ok(items.includes('type:@wsagency/example:./meta.json:Metadata'))
})
