import assert from 'node:assert/strict'
import { test } from 'node:test'
import { appCapabilityManifestClosures, checkAppCapabilitySizes } from './app-capability-size.ts'
import { APP_CAPABILITIES } from './app-capabilities.ts'
test('applies approved signals and Island budget amendments', () => {
  assert.equal(APP_CAPABILITIES.find(({ helper }) => helper === 'signals')?.budgetBytes, 1_600)
  assert.equal(APP_CAPABILITIES.find(({ helper }) => helper === 'island')?.budgetBytes, 4_864)
  assert.equal(checkAppCapabilitySizes({ helper: 'signals', helperOnlyBytes: 1_600, eagerReachable: false }).ok, true)
  assert.equal(checkAppCapabilitySizes({ helper: 'signals', helperOnlyBytes: 1_601, eagerReachable: false }).ok, false)
  assert.equal(checkAppCapabilitySizes({ helper: 'island', helperOnlyBytes: 4_864, eagerReachable: false }).ok, true)
  assert.equal(checkAppCapabilitySizes({ helper: 'island', helperOnlyBytes: 4_865, eagerReachable: false }).ok, false)
})

const helpers = ['signals', 'validation', 'persistence', 'breakpoints', 'locale', 'clipboard', 'scroll', 'resize'] as const

test('budgetsExcludeFrameworkPeerCode by measuring helper-only payload limits', () => {
  for (const helper of helpers) assert.equal(checkAppCapabilitySizes({ helper, helperOnlyBytes: 1_536, eagerReachable: false }).ok, true)
  assert.deepEqual(checkAppCapabilitySizes({ helper: 'clipboard', helperOnlyBytes: 1_537, eagerReachable: false }).errors,
    ['clipboard helper-only Brotli-q11 size 1537 B exceeds 1536 B'])
})

test('islandBudgetIncludesIdiomorph', () => {
  assert.equal(checkAppCapabilitySizes({ helper: 'island', helperOnlyBytes: 4_864, eagerReachable: false }).ok, true)
  assert.match(checkAppCapabilitySizes({ helper: 'island', helperOnlyBytes: 4_865, eagerReachable: false }).errors[0]!, /4864 B/)
})

test('rejectsEagerReachability', () => {
  assert.equal(checkAppCapabilitySizes({ helper: 'scroll', helperOnlyBytes: 353, eagerReachable: false }).ok, true)
  assert.deepEqual(checkAppCapabilitySizes({ helper: 'scroll', helperOnlyBytes: 353, eagerReachable: true }).errors,
    ['scroll is eagerly reachable; helper imports must remain independently lazy'])
})

test('rejects invalid byte measurements', () => {
  assert.equal(checkAppCapabilitySizes({ helper: 'locale', helperOnlyBytes: Number.NaN, eagerReachable: false }).ok, false)
})

test('buildsEachHelperInAnIndependentEntry', () => {
  const entries = helpers.map((helper) => ({
    helper,
    manifest: {
      'shell.js': { file: 'shell.js', dynamicImports: [`${helper}.js`] },
      [`${helper}.js`]: { file: `assets/${helper}.js` },
    },
  }))
  for (const fixture of entries) {
    const closure = appCapabilityManifestClosures(fixture.manifest, 'shell.js')
    assert.deepEqual([...closure.eager], ['shell.js'])
    assert.deepEqual([...closure.dynamic], [`${fixture.helper}.js`])
  }
})

test('noHelperIsEagerUnlessImportedByShell manifests keep lazy helper out of static reachability', () => {
  const manifest = {
    'shell.js': { file: 'shell.js', imports: ['framework.js'], dynamicImports: ['clipboard.js'] },
    'framework.js': { file: 'framework.js' },
    'clipboard.js': { file: 'clipboard.js' },
  }
  const closure = appCapabilityManifestClosures(manifest, 'shell.js')
  assert.deepEqual([...closure.eager], ['shell.js', 'framework.js'])
  assert.equal(closure.eager.has('clipboard.js'), false)
})
