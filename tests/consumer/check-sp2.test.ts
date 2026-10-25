import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkPackedSp2Artifacts, checkFoldkitUiTreeShaking, checkNoPrimitivePackageReferences, disallowedEffectModules } from './check-sp2.ts'

test('SP2 packed public exports and CSS subpaths are covered by the coverage manifest', async () => {
  const root = new URL('../..', import.meta.url)
  const manifest = JSON.parse(await readFile(new URL('tests/consumer/coverage-manifest.json', root), 'utf8')) as Record<string, string | string[]>
  const packageJson = JSON.parse(await readFile(new URL('packages/themes/package.json', root), 'utf8')) as {
    name: string
    exports: Record<string, unknown>
  }
  const exportedSubpaths = Object.keys(packageJson.exports).filter((subpath) =>
    subpath.startsWith('./components/') || subpath.startsWith('./css/') || subpath.startsWith('./styles/css/'))
  const required = exportedSubpaths.map((subpath) => `subpath:${packageJson.name}:${subpath}`)
  const missing = required.filter((item) => !Object.hasOwn(manifest, item))
  assert.deepEqual(missing, [])
})

test('absorbed Foldkit UI exports are covered and primitives are absent from the manifest', async () => {
  const manifest = JSON.parse(await readFile(new URL('coverage-manifest.json', import.meta.url), 'utf8')) as Record<string, string | string[]>
  const packageJson = JSON.parse(await readFile(new URL('../../packages/foldkit-ui/package.json', import.meta.url), 'utf8')) as {
    name: string
    exports: Record<string, unknown>
  }
  const requiredSubpaths = ['./checkboxGroup', './tooltip/group', './listboxSelect']
  const required = [
    ...requiredSubpaths.map(subpath => `subpath:${packageJson.name}:${subpath}`),
    `export:${packageJson.name}:./checkboxGroup:view`,
    `export:${packageJson.name}:./tooltip/group:SkipDelay`,
    `export:${packageJson.name}:./listboxSelect:createSelect`,
    `export:${packageJson.name}:./menu:createContextMenu`,
    `export:${packageJson.name}:./menu:ContextInvocationSchema`,
    `export:${packageJson.name}:./slider:Range`,
    `type:${packageJson.name}:./listbox:InitConfig`,
    `type:${packageJson.name}:./listbox:ViewInputs`,
  ]
  assert.deepEqual(requiredSubpaths.filter(subpath => !Object.hasOwn(packageJson.exports, subpath)), [])
  assert.deepEqual(required.filter(item => !Object.hasOwn(manifest, item)), [])
  assert.equal(Object.keys(manifest).some(item => item.includes('@wsagency/wseffect-primitives')), false)
})

test('SP2 packed CSS artifacts are exercised by the consumer runner', async () => {
  const source = await readFile(new URL('run.ts', import.meta.url), 'utf8')
  assert.match(source, /checkPackedSp2Artifacts\(themesPackage\)/)
  assert.match(source, /sp2-packed/)
})

test('packed runner checks Foldkit UI tree-shaking and excludes the primitives package', async () => {
  const source = await readFile(new URL('run.ts', import.meta.url), 'utf8')
  assert.match(source, /checkFoldkitUiTreeShaking\(foldkitUiSources\)/)
  assert.match(source, /checkNoPrimitivePackageReferences/)
  assert.match(source, /sp2\/foldkit-ui\.ts/)
  assert.doesNotMatch(source, /@wsagency\/wseffect-primitives/)
})
test('SP2 packed notices are recognized without relying on source casing', async () => {
  const packageDir = await mkdtemp(join(tmpdir(), 'wseffect-sp2-package-'))
  const cssDir = join(packageDir, 'dist/styles/css')
  try {
    await mkdir(cssDir, { recursive: true })
    await Promise.all([
      writeFile(join(packageDir, 'LICENSE'), 'MIT License\nradix2solid\nradix themes\nradix colors\n'),
      writeFile(join(packageDir, 'UPSTREAM.md'), 'Radix2Solid\nRadix Themes\nRadix Colors\n'),
      writeFile(join(cssDir, 'checkbox-group.css'), '.checkbox-group {}'),
    ])
    await checkPackedSp2Artifacts(packageDir)
  } finally {
    await rm(packageDir, { recursive: true, force: true })
  }
})


test('SP2 packed upstream provenance and license notices are checked', async () => {
  const checker = await readFile(new URL('check-sp2.ts', import.meta.url), 'utf8')
  assert.match(checker, /UPSTREAM\.md/)
  assert.match(checker, /LICENSE/)
  assert.match(checker, /Radix2Solid/)
  assert.match(checker, /Radix Themes/)
  assert.match(checker, /Radix Colors/)
})


test('packed SP2 Foldkit UI tree-shaking includes CheckboxGroup without unrelated UI subpaths', () => {
  assert.deepEqual(checkFoldkitUiTreeShaking([
    '/consumer/node_modules/@wsagency/wseffect-foldkit-ui/dist/checkboxGroup/index.js',
    '/consumer/node_modules/@wsagency/wseffect-foldkit-ui/dist/checkbox/index.js',
  ]), [])
  assert.deepEqual(checkFoldkitUiTreeShaking([
    '/consumer/node_modules/@wsagency/wseffect-foldkit-ui/dist/checkboxGroup/index.js',
    '/consumer/node_modules/@wsagency/wseffect-foldkit-ui/dist/checkbox/index.js',
    '/consumer/node_modules/@wsagency/wseffect-foldkit-ui/dist/menu/index.js',
  ]), [
    'packed SP2 Foldkit UI tree-shaking bundle includes unrelated modules: /consumer/node_modules/@wsagency/wseffect-foldkit-ui/dist/menu/index.js',
  ])
})

test('packed consumer rejects the removed primitives package from its packed set', () => {
  assert.deepEqual(checkNoPrimitivePackageReferences([
    '@wsagency/wseffect-themes',
    '@wsagency/wseffect-foldkit-ui',
    'lockfile without the removed package',
  ]), [])
  assert.deepEqual(checkNoPrimitivePackageReferences([
    '@wsagency/wseffect-themes',
    '@wsagency/wseffect-primitives',
  ]), [
    'packed consumer contains removed package reference: @wsagency/wseffect-primitives',
  ])
})

test('SP2 Box and Heading bundle has no Effect modules', () => {
  assert.deepEqual(disallowedEffectModules([
    '/consumer/node_modules/@wsagency/wseffect-themes/dist/components/box.js',
    '/consumer/node_modules/@wsagency/wseffect-themes/dist/components/heading.js',
  ]), [])
  assert.deepEqual(disallowedEffectModules([
    '/consumer/node_modules/.pnpm/effect@4.0.5/node_modules/effect/dist/Schema.js',
  ]), ['/consumer/node_modules/.pnpm/effect@4.0.5/node_modules/effect/dist/Schema.js'])
})
