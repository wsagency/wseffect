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
  peerDependencies: { foldkit: '0.168.0', effect: '^4.0.5', '@effect/platform-browser': '^4.0.5' },
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

test('checkWorkspace requires the exact UP-8 consumer block', () => {
  const workspace = `overrides:\n  effect: 4.0.5\n  '@effect/platform-browser': 4.0.5\npeerDependencyRules:\n  allowedVersions:\n    foldkit>effect: 4.0.5\n    foldkit>@effect/platform-browser: 4.0.5\n    '@foldkit/ui>effect': 4.0.5\n    '@foldkit/vite-plugin>effect': 4.0.5\n`
  assert.deepEqual(checkWorkspace(workspace), [])
  assert.match(checkWorkspace(workspace.replace('effect: 4.0.5', 'effect: 4.0.6')).join('\n'), /UP-8/)
})

test('checkEffectCopies reports duplicate Effect versions', () => {
  const errors = checkEffectCopies(`lockfileVersion: '9.0'\nimporters:\n  .: {}\npackages:\n  effect@4.0.0:\n    resolution: {integrity: sha512-a}\n  effect@4.0.5:\n    resolution: {integrity: sha512-b}\n`)
  assert.match(errors.join('\n'), /effect/)
})
