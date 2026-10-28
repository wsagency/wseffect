import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { inspectArchive } from './inspect.ts'

const repositoryUrl = 'git+https://github.com/wsagency/wseffect.git'
const version = '0.0.0'
const name = '@wsagency/wseffect-foldkit'
let fixtureRoot = ''
let archivePath = ''

async function createArchive(options: { manifest?: Record<string, unknown>; extraFiles?: Record<string, string>; omit?: string[] } = {}) {
  const root = join(fixtureRoot, `fixture-${Math.random().toString(36).slice(2)}`)
  const packageRoot = join(root, 'package')
  await mkdir(packageRoot, { recursive: true })
  const manifest = options.manifest ?? {
    name,
    version,
    repository: { type: 'git', url: repositoryUrl, directory: 'packages/foldkit' },
    homepage: 'https://wseffect.com',
    bugs: { url: 'https://github.com/wsagency/wseffect/issues' },
    publishConfig: { access: 'public', registry: 'https://registry.npmjs.org/', tag: 'next' },
    dependencies: { '@wsagency/wseffect-core': version },
  }
  const files: Record<string, string> = {
    'package.json': JSON.stringify(manifest),
    'README.md': '# Fixture\n',
    'LICENSE': 'MIT License\n',
    'CHANGELOG.md': 'Initial release\n',
    'WS-AGENCY-NOTICE.md': 'Unofficial; not endorsed by WS Agency.\n',
    'UPSTREAM.md': 'Upstream information\n',
    'dist/index.js': 'export {}\n',
    'dist/index.d.ts': 'export {}\n',
    ...options.extraFiles,
  }
  for (const [path, contents] of Object.entries(files)) {
    if (options.omit?.includes(path)) continue
    const target = join(packageRoot, path)
    await mkdir(join(target, '..'), { recursive: true })
    await writeFile(target, contents)
  }
  const archive = join(fixtureRoot, `fixture-${Math.random().toString(36).slice(2)}.tgz`)
  execFileSync('tar', ['-czf', archive, '-C', root, 'package'])
  return archive
}

before(async () => { fixtureRoot = await mkdtemp(join(tmpdir(), 'wseffect-inspect-')) })
after(async () => { await rm(fixtureRoot, { recursive: true, force: true }) })

const inspect = (path: string) => inspectArchive({ archivePath: path, expectedName: name, version, repositoryUrl })

test('checksPackedManifestAndWorkspaceRewrite', async () => {
  const archive = await createArchive()
  const result = await inspect(archive)
  assert.deepEqual(result.errors, [])
  assert.match(result.sha256, /^[a-f0-9]{64}$/)
  assert.equal(result.manifest.name, name)
  assert.equal(result.manifest.version, version)
  const wrongVersion = await inspect(await createArchive({
    manifest: { ...result.manifest, dependencies: { '@wsagency/wseffect-core': '0.1.0-rc.0' } },
  }))
  assert.ok(wrongVersion.errors.some((error) => /internal dependency/i.test(error)))
})
test('rejectsWrongPackedPackageIdentityAndRepository', async () => {
  const base = {
    name, version,
    exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' } },
    repository: { type: 'git', url: repositoryUrl, directory: 'packages/foldkit' },
    homepage: 'https://wseffect.com',
    bugs: { url: 'https://github.com/wsagency/wseffect/issues' },
    publishConfig: { access: 'public', registry: 'https://registry.npmjs.org/', tag: 'next' },
    dependencies: { '@wsagency/wseffect-core': version },
  }
  const cases: Array<{ manifest: Record<string, unknown>; expectedError: RegExp }> = [
    { manifest: { ...base, name: '@wsagency/wseffect-other' }, expectedError: /manifest name/i },
    { manifest: { ...base, version: '9.9.9' }, expectedError: /manifest version/i },
    { manifest: { ...base, repository: { type: 'git', url: 'https://example.com/repo.git', directory: 'packages/foldkit' } }, expectedError: /repository URL/i },
  ]
  for (const { manifest, expectedError } of cases) {
    const result = await inspect(await createArchive({ manifest }))
    assert.ok(result.errors.some((error) => expectedError.test(error)), `expected ${expectedError}; got ${result.errors.join('; ')}`)
  }
})
test('rejectsChangedReleaseMetadata', async () => {
  const base = {
    name, version,
    exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' } },
    repository: { type: 'git', url: repositoryUrl, directory: 'packages/foldkit' },
    homepage: 'https://wseffect.com',
    bugs: { url: 'https://github.com/wsagency/wseffect/issues' },
    publishConfig: { access: 'public', registry: 'https://registry.npmjs.org/', tag: 'next' },
    dependencies: { '@wsagency/wseffect-core': version },
  }
  for (const patch of [
    { homepage: 'https://example.com' },
    { bugs: { url: 'https://example.com/issues' } },
    { publishConfig: { access: 'restricted', registry: 'https://registry.npmjs.org/', tag: 'next' } },
  ]) {
    const result = await inspect(await createArchive({ manifest: { ...base, ...patch } }))
    assert.ok(result.errors.length > 0)
  }
})

test('checksExportTargetsAndRequiredDocs', async () => {
  const good = await inspect(await createArchive())
  assert.deepEqual(good.errors, [])
  const badManifest = { name, version, exports: { '.': './missing.js' }, repository: { type: 'git', url: repositoryUrl, directory: 'packages/foldkit' }, dependencies: {} }
  const missingTarget = await inspect(await createArchive({ manifest: badManifest }))
  assert.ok(missingTarget.errors.some((error) => /export.*missing/i.test(error)))
  const missingDoc = await inspect(await createArchive({ omit: ['README.md'] }))
  assert.ok(missingDoc.errors.some((error) => /README/i.test(error)))
  for (const filename of ['LICENSE', 'CHANGELOG.md']) {
    const missingRequiredFile = await inspect(await createArchive({ omit: [filename] }))
    assert.ok(missingRequiredFile.errors.some((error) => error.includes(filename)))
  }
})

test('rejectsForbiddenWorkspaceFileLinkSpecs', async () => {
  for (const spec of ['workspace:*', 'file:../other', 'link:../other']) {
    const manifest = { name, version, exports: { '.': './dist/index.js' }, repository: { type: 'git', url: repositoryUrl, directory: 'packages/foldkit' }, dependencies: { '@wsagency/wseffect-core': spec } }
    const result = await inspect(await createArchive({ manifest }))
    assert.ok(result.errors.some((error) => error.includes(spec)), `expected rejection for ${spec}`)
  }
})

test('rejectsMissingNoticesOrUPSTREAM', async () => {
  for (const filename of ['WS-AGENCY-NOTICE.md', 'UPSTREAM.md']) {
    const result = await inspect(await createArchive({ omit: [filename] }))
    assert.ok(result.errors.some((error) => error.includes(filename)))
  }
})

test('rejectsUnexportedTestArtifactsAndMaps', async () => {
  for (const filename of ['dist/internal.test.js', 'dist/internal.d.ts.map', 'dist/__tests__/private.js', 'dist/test/private.js', 'dist/vitest-setup.js']) {
    const result = await inspect(await createArchive({ extraFiles: { [filename]: 'not exported' } }))
    assert.ok(result.errors.some((error) => error.includes(filename)), `expected rejection for ${filename}; got ${result.errors.join('; ')}`)
  }
})
test('rejectsMissingExportedTestUtilityTarget', async () => {
  const manifest = {
    name, version,
    exports: {
      './test': { types: './dist/test/public.d.ts', import: './dist/test/public.js' },
      './test/vitest': { types: './dist/test/vitest.d.ts', import: './dist/test/vitest.js' },
    },
    repository: { type: 'git', url: repositoryUrl, directory: 'packages/foldkit' },
    homepage: 'https://wseffect.com',
    bugs: { url: 'https://github.com/wsagency/wseffect/issues' },
    publishConfig: { access: 'public', registry: 'https://registry.npmjs.org/', tag: 'next' },
    dependencies: {},
  }
  const result = await inspect(await createArchive({
    manifest,
    extraFiles: {
      'dist/test/public.js': '',
      'dist/test/public.d.ts': '',
      'dist/test/vitest.d.ts': '',
    },
    omit: ['dist/test/vitest.js'],
  }))
  assert.ok(result.errors.some((error) => error.includes('dist/test/vitest.js')))
})
test('allowsOnlyFoldkitTestUtilityImportClosure', async () => {
  const manifest = {
    name, version,
    exports: {
      './test': { types: './dist/test/public.d.ts', import: './dist/test/public.js' },
      './test/vitest': { types: './dist/test/vitest.d.ts', import: './dist/test/vitest.js' },
    },
    repository: { type: 'git', url: repositoryUrl, directory: 'packages/foldkit' },
    homepage: 'https://wseffect.com',
    bugs: { url: 'https://github.com/wsagency/wseffect/issues' },
    publishConfig: { access: 'public', registry: 'https://registry.npmjs.org/', tag: 'next' },
    dependencies: {},
  }
  const extraFiles = {
    'dist/test/public.js': `import './internal.js'\n`,
    'dist/test/public.d.ts': `import type { Internal } from './internal.js'\nexport {}\n`,
    'dist/test/vitest.js': `import './internal.js'\n`,
    'dist/test/vitest.d.ts': 'export {}\n',
    'dist/test/internal.js': 'export {}\n',
    'dist/test/internal.d.ts': 'export type Internal = unknown\n',
  }
  const accepted = await inspect(await createArchive({ manifest, extraFiles }))
  assert.deepEqual(accepted.errors, [])
  const rejected = await inspect(await createArchive({ manifest, extraFiles: { ...extraFiles, 'dist/test/private.js': 'export {}\n' } }))
  assert.ok(rejected.errors.some((error) => error.includes('dist/test/private.js')))
})

test('rejectsSecretOrHostPathMarkers', async () => {
  for (const marker of ['/home/person/private', '$HOME/.cache/file', 'git.wsagency.io', 'ghp_abcdefghijklmnopqrstuvwxyz123456', '-----BEGIN PRIVATE KEY-----']) {
    const result = await inspect(await createArchive({ extraFiles: { 'dist/secret.txt': marker } }))
    assert.ok(result.errors.some((error) => /forbidden|secret|host.path/i.test(error)), `expected rejection for ${marker}`)
  }
})
