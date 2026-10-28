import assert from 'node:assert/strict'
import test from 'node:test'
import { checkEffectCopies, checkManifest, checkWorkspace } from './check-repo.ts'

const manifest = () => ({
  name: '@wsagency/wseffect-app',
  version: '0.0.0',
  private: false,
  type: 'module',
  license: 'MIT',
  publishConfig: { access: 'public' },
  repository: {
    type: 'git',
    url: 'git+https://git.wsagency.io/ws-agency/wseffect.git',
    directory: 'packages/app',
  },
  files: ['dist', 'LICENSE', 'README.md', 'CHANGELOG.md'],
  exports: { '.': { types: './dist/index.d.ts', default: './dist/index.js' } },
  sideEffects: false,
  peerDependencies: { '@wsagency/wseffect-foldkit': 'workspace:*', effect: '^4.0.5', '@effect/platform-browser': '^4.0.5' },
  devDependencies: { typescript: '7.0.2' },
})

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
