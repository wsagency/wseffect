import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { checkDevelopmentPackageVersions, checkEffectCopies, checkManifest, checkWorkspace } from './check-repo.ts'

const manifest = () => ({
  name: '@wsagency/wseffect-app',
  version: '0.0.0',
  private: false,
  type: 'module',
  license: 'MIT',
  publishConfig: { access: 'public' },
  repository: {
    type: 'git',
    url: 'git+https://github.com/wsagency/wseffect.git',
    directory: 'packages/app',
  },
  files: ['dist', 'LICENSE', 'README.md', 'CHANGELOG.md'],
  exports: { '.': { types: './dist/index.d.ts', default: './dist/index.js' } },
  sideEffects: false,
  peerDependencies: { '@wsagency/wseffect-foldkit': 'workspace:*', effect: '^4.0.5', '@effect/platform-browser': '^4.0.5' },
  devDependencies: { typescript: '7.0.2' },
})

const developmentVersions = (version = '0.1.0-rc.0') => ({
  'packages/app/package.json': version,
  'packages/themes/package.json': version,
  'packages/foldkit/package.json': version,
  'packages/foldkit-ui/package.json': version,
  'packages/vite-plugin/package.json': version,
})

test('acceptsDevelopmentVersionOutsideRelease', () => {
  assert.deepEqual(checkManifest(manifest(), 'packages/app/package.json'), [])
})

test('acceptsCoordinatedRcForDevelopment', () => {
  const fixture = manifest()
  fixture.version = '0.1.0-rc.0'
  assert.deepEqual(checkManifest(fixture, 'packages/app/package.json'), [])
})

test('acceptsNextAlignedRcForDevelopment', () => {
  const fixture = manifest()
  fixture.version = '0.1.0-rc.1'
  assert.deepEqual(checkManifest(fixture, 'packages/app/package.json'), [])
  assert.deepEqual(checkDevelopmentPackageVersions(developmentVersions('0.1.0-rc.1')), [])
})

test('rejectsDevelopmentVersionSkew', () => {
  const versions = { ...developmentVersions(), 'packages/themes/package.json': '0.1.0-rc.1' }
  assert.ok(checkDevelopmentPackageVersions(versions).some((error) =>
    error.includes('packages/themes/package.json: version must match 0.1.0-rc.0')))
})

test('rejectsInvalidDevelopmentSemver', () => {
  assert.ok(checkDevelopmentPackageVersions(developmentVersions('0.1.0-rc.01')).some((error) =>
    error.includes('version must be valid semver')))
})

test('acceptsCanonicalPublicRepositoryOutsideReleaseMode', () => {
  const fixture = manifest()
  fixture.repository.url = 'git+https://github.com/wsagency/wseffect.git'
  assert.deepEqual(checkManifest(fixture, 'packages/app/package.json'), [])
})

test('acceptsOnlySamePreparedRcForRelease', () => {
  const fixture = releaseManifest()
  assert.deepEqual(checkManifest(fixture, 'packages/app/package.json', '0.1.0-rc.0'), [])
  assert.ok(checkManifest(manifest(), 'packages/app/package.json', '0.1.0-rc.0').some((error) => error.includes('version')))
})

test('releaseModeStillRequiresExactVersionAndMetadata', () => {
  const fixture = releaseManifest()
  assert.deepEqual(checkManifest(fixture, 'packages/app/package.json', '0.1.0-rc.0'), [])

  fixture.version = '0.1.0-rc.1'
  fixture.publishConfig.tag = 'latest'
  const errors = checkManifest(fixture, 'packages/app/package.json', '0.1.0-rc.0')
  assert.ok(errors.some((error) => error.includes('version must be 0.1.0-rc.0')))
  assert.ok(errors.some((error) => error.includes('publishConfig.tag must be next')))
})

test('rejectsVersionSkew', () => {
  const fixture = releaseManifest()
  fixture.version = '0.1.0-rc.1'
  assert.ok(checkManifest(fixture, 'packages/foldkit/package.json', '0.1.0-rc.0').some((error) => error.includes('version')))
})

test('requiresPublicGitHubRepositoryAndHomepage', () => {
  const fixture = releaseManifest()
  fixture.repository.url = 'git+https://github.com/other/wseffect.git'
  fixture.homepage = 'https://internal.example'
  const errors = checkManifest(fixture, 'packages/app/package.json', '0.1.0-rc.0')
  assert.ok(errors.some((error) => error.includes('repository')))
  assert.ok(errors.some((error) => error.includes('homepage')))
})

test('requiresNextTagAndPublicAccess', () => {
  const fixture = releaseManifest()
  fixture.publishConfig.access = 'restricted'
  fixture.publishConfig.tag = 'latest'
  const errors = checkManifest(fixture, 'packages/app/package.json', '0.1.0-rc.0')
  assert.ok(errors.some((error) => error.includes('publishConfig.access')))
  assert.ok(errors.some((error) => error.includes('publishConfig.tag')))
})

test('requiresPublicNpmRegistry', () => {
  const fixture = releaseManifest()
  fixture.publishConfig.registry = 'https://registry.internal.example/'
  assert.ok(checkManifest(fixture, 'packages/app/package.json', '0.1.0-rc.0').some((error) => error.includes('publishConfig.registry')))
})

test('requiresRepositoryDirectoryToMatchManifestPath', () => {
  const fixture = releaseManifest()
  fixture.repository.directory = 'packages/themes'
  assert.ok(checkManifest(fixture, 'packages/app/package.json', '0.1.0-rc.0').some((error) => error.includes('repository.directory')))
})

test('requiresWsAgencyMaintainerAndVendoredUpstreamAuthor', () => {
  const fixture = releaseManifest()
  fixture.maintainers = [{ name: 'Other Agency', url: 'https://other.example' }]
  fixture.author = 'Other Author'
  fixture.repository.directory = 'packages/foldkit'
  const errors = checkManifest(fixture, 'packages/foldkit/package.json', '0.1.0-rc.0')
  assert.ok(errors.some((error) => error.includes('maintainers')))
  assert.ok(errors.some((error) => error.includes('author')))

  fixture.maintainers = [{ name: 'WS Agency', url: 'https://ws.agency' }]
  fixture.author = 'Devin Jameson'
  const validAttributionErrors = checkManifest(fixture, 'packages/foldkit/package.json', '0.1.0-rc.0')
  assert.ok(!validAttributionErrors.some((error) => error.includes('maintainers') || error.includes('author')))
})

test('requiresPublicPackageMetadata', () => {
  const fixture = releaseManifest()
  fixture.description = ''
  fixture.keywords = []
  fixture.author = ''
  fixture.maintainers = []
  fixture.engines = {}
  const errors = checkManifest(fixture, 'packages/app/package.json', '0.1.0-rc.0')
  for (const field of ['description', 'keywords', 'author', 'maintainers', 'engines']) {
    assert.ok(errors.some((error) => error.includes(field)), `expected ${field} validation`)
  }
})

test('all release package manifests have canonical npm metadata', async () => {
  for (const name of ['app', 'themes', 'foldkit', 'foldkit-ui', 'vite-plugin']) {
    const path = `packages/${name}/package.json`
    const fixture = JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'))
    assert.deepEqual(checkManifest(fixture, path, '0.1.0-rc.0'), [], `${path} must be release-ready`)
    assert.equal(fixture.version, '0.1.0-rc.0', `${path} must use the coordinated RC`)
    if (name === 'app') {
      assert.equal(fixture.description, 'A Foldkit application foundation with lazy page loading, offline support, update prompts, and deployment-version checks.')
      assert.deepEqual(fixture.keywords, ['foldkit', 'effect', 'application', 'lazy-pages', 'pwa', 'vite'])
    }
    assert.deepEqual(fixture.repository, {
      type: 'git',
      url: 'git+https://github.com/wsagency/wseffect.git',
      directory: `packages/${name}`,
    })
    assert.deepEqual(fixture.homepage, 'https://wseffect.com')
    assert.deepEqual(fixture.bugs, { url: 'https://github.com/wsagency/wseffect/issues' })
    assert.deepEqual(fixture.publishConfig, {
      access: 'public',
      registry: 'https://registry.npmjs.org/',
      tag: 'next',
    })
    assert.deepEqual(fixture.engines, { node: '>=20.19.0' }, `${path} runtime floor`)
  }
})

test('every release package has an RC.0 changelog entry', async () => {
  for (const name of ['app', 'themes', 'foldkit', 'foldkit-ui', 'vite-plugin']) {
    const changelog = await readFile(new URL(`../packages/${name}/CHANGELOG.md`, import.meta.url), 'utf8')
    assert.match(changelog, /^# .*\n\n## 0\.1\.0-rc\.0\b/m, `${name} changelog must begin with coordinated RC.0`)
  }
})

function releaseManifest() {
  return {
    ...manifest(),
    version: '0.1.0-rc.0',
    homepage: 'https://wseffect.com',
    bugs: { url: 'https://github.com/wsagency/wseffect/issues' },
    description: 'Effect integration packages',
    keywords: ['effect'],
    author: 'WS Agency',
    maintainers: [{ name: 'WS Agency', url: 'https://ws.agency' }],
    engines: { node: '>=20' },
    publishConfig: { registry: 'https://registry.npmjs.org/', access: 'public', tag: 'next' },
    repository: {
      type: 'git',
      url: 'git+https://github.com/wsagency/wseffect.git',
      directory: 'packages/app',
    },
  }
}

test('checkManifest rejects ranged dev dependencies', () => {
  const fixture = manifest()
  fixture.devDependencies.typescript = '^7.0.2'
  assert.match(checkManifest(fixture, 'packages/app/package.json').join('\n'), /typescript/)
})

test('checkManifest rejects missing files entries', () => {
  const fixture = manifest()
  delete fixture.files
  assert.match(checkManifest(fixture, 'packages/app/package.json').join('\n'), /files/)
})

test('Themes may package the pinned upstream provenance record', () => {
  const fixture = manifest()
  fixture.name = '@wsagency/wseffect-themes'
  fixture.sideEffects = ['**/*.css']
  fixture.files.push('UPSTREAM.md')
  assert.deepEqual(checkManifest(fixture, 'packages/themes/package.json'), [])
})

test('release packages may ship WS Agency notices and upstream provenance', () => {
  const packageFiles = [
    ['app', ['dist', 'LICENSE', 'README.md', 'CHANGELOG.md', 'WS-AGENCY-NOTICE.md']],
    ['themes', ['dist', 'LICENSE', 'README.md', 'CHANGELOG.md', 'UPSTREAM.md', 'WS-AGENCY-NOTICE.md']],
    ['foldkit', ['dist', 'LICENSE', 'README.md', 'CHANGELOG.md', 'THIRD-PARTY-NOTICES.md', 'UPSTREAM.md', 'WS-AGENCY-NOTICE.md']],
    ['foldkit-ui', ['dist', 'LICENSE', 'README.md', 'CHANGELOG.md', 'THIRD-PARTY-NOTICES.md', 'UPSTREAM.md', 'WS-AGENCY-NOTICE.md']],
    ['vite-plugin', ['dist', 'LICENSE', 'README.md', 'CHANGELOG.md', 'THIRD-PARTY-NOTICES.md', 'UPSTREAM.md', 'WS-AGENCY-NOTICE.md']],
  ] as const
  for (const [directory, files] of packageFiles) {
    const fixture = {
      ...releaseManifest(),
      name: `@wsagency/wseffect-${directory}`,
      repository: {
        type: 'git',
        url: 'git+https://github.com/wsagency/wseffect.git',
        directory: `packages/${directory}`,
      },
      files: [...files],
      ...(directory === 'themes' ? { sideEffects: ['**/*.css'] } : {}),
      ...(['foldkit', 'foldkit-ui', 'vite-plugin'].includes(directory) ? { author: 'Devin Jameson' } : {}),
    }
    assert.deepEqual(checkManifest(fixture, `packages/${directory}/package.json`, '0.1.0-rc.0'), [], directory)
  }
})

test('checkManifest rejects sideEffects true', () => {
  const fixture = manifest()
  fixture.sideEffects = true
  assert.match(checkManifest(fixture, 'packages/app/package.json').join('\n'), /sideEffects/)
})

test('checkManifest requires the Effect peer range', () => {
  const fixture = manifest()
  fixture.peerDependencies.effect = '4.0.5'
  assert.match(checkManifest(fixture, 'packages/app/package.json').join('\n'), /effect/)
})

test('checkManifest rejects patched dependencies', () => {
  const fixture = { ...manifest(), pnpm: { patchedDependencies: { foldkit: 'patches/foldkit.patch' } } }
  assert.match(checkManifest(fixture, 'packages/app/package.json').join('\n'), /patchedDependencies/)
})

test('checkManifest requires the workspace Foldkit peer name', () => {
  const fixture = manifest()
  fixture.peerDependencies['@wsagency/wseffect-foldkit'] = '0.168.0'
  assert.match(checkManifest(fixture, 'packages/app/package.json').join('\n'), /peerDependencies\.@wsagency\/wseffect-foldkit/)
})

test('checkWorkspace rejects additional overrides', () => {
  const workspace = `overrides:
  effect: 4.0.7
  '@effect/platform-browser': 4.0.7
  solid-js: 1.9.9
`
  assert.match(checkWorkspace(workspace).join('\n'), /overrides/)
})

test('checkWorkspace rejects patchedDependencies', () => {
  const workspace = `patchedDependencies:
  foldkit: patches/foldkit.patch
overrides:
  effect: 4.0.7
  '@effect/platform-browser': 4.0.7
`
  assert.match(checkWorkspace(workspace).join('\n'), /overrides/)
})

test('checkWorkspace rejects packageExtensions', () => {
  const workspace = `packageExtensions:
  foldkit:
    peerDependencies:
      effect: ^4.0.5
overrides:
  effect: 4.0.7
  '@effect/platform-browser': 4.0.7
`
  assert.match(checkWorkspace(workspace).join('\n'), /overrides/)
})

test('checkWorkspace rejects obsolete peer rules', () => {
  const workspace = `overrides:
  effect: 4.0.7
  '@effect/platform-browser': 4.0.7
peerDependencyRules:
  allowedVersions:
    foldkit>effect: 4.0.5
`
  assert.match(checkWorkspace(workspace).join('\n'), /overrides/)
})

test('checkWorkspace accepts the exact shared Effect pins', () => {
  const workspace = `overrides:
  effect: 4.0.7
  '@effect/platform-browser': 4.0.7
`
  assert.deepEqual(checkWorkspace(workspace), [])
  assert.match(checkWorkspace(workspace.replace('effect: 4.0.7', 'effect: 4.0.6')).join('\n'), /overrides/)
})

test('checkEffectCopies reports duplicate Effect versions', () => {
  const errors = checkEffectCopies(`lockfileVersion: '9.0'\nimporters:\n  .: {}\npackages:\n  effect@4.0.0:\n    resolution: {integrity: sha512-a}\n  effect@4.0.5:\n    resolution: {integrity: sha512-b}\n`)
  assert.match(errors.join('\n'), /effect/)
})
