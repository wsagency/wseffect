import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'

const packageRoot = resolve(import.meta.dirname, '../packages/primitives')

test('package manifest exposes six ESM subpaths', async () => {
  const manifest = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8')) as {
    type: string
    sideEffects: boolean
    exports: Record<string, { types: string; default: string }>
  }
  assert.equal(manifest.type, 'module')
  assert.equal(manifest.sideEffects, false)
  assert.deepEqual(Object.keys(manifest.exports).sort(), [
    './checkbox-group', './context-menu', './range-slider', './select', './select-position', './tooltip-group',
  ])
  for (const target of Object.values(manifest.exports)) {
    assert.match(target.types, /^\.\/dist\/.+\.d\.ts$/)
    assert.match(target.default, /^\.\/dist\/.+\.js$/)
  }
})

test('package peers and direct dependencies match REPO-1', async () => {
  const manifest = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8')) as {
    peerDependencies: Record<string, string>
    dependencies: Record<string, string>
    sideEffects: boolean
  }
  assert.deepEqual(manifest.peerDependencies, {
    '@effect/platform-browser': '^4.0.5',
    '@wsagency/wseffect-foldkit-ui': '0.168.0',
    effect: '^4.0.5',
    foldkit: '0.168.0',
  })
  assert.deepEqual(manifest.dependencies, { '@floating-ui/dom': '1.8.0' })
  assert.equal(manifest.sideEffects, false)
})
