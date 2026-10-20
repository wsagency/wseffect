import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  APP_CAPABILITIES,
  checkAppCapabilityModules,
  checkUnusedAppCapabilityModules,
  effectModulesFromSourceMap,
  resolveAppCapabilityAvailability,
  formatAppCapabilityModuleFailure,
} from './app-capabilities.ts'

const baseline = ['effect/dist/Effect.js', 'effect/dist/Schema.js', 'effect/dist/Clock.js']

test('allowsFrameworkBaselineModules', () => {
  assert.deepEqual(checkAppCapabilityModules({ helper: 'clipboard', modules: baseline, baseline }), { ok: true, unexpected: [] })
})

test('allowsOnlyKeyValueStoreForPersistence', () => {
  const result = checkAppCapabilityModules({
    helper: 'persistence',
    baseline,
    modules: [...baseline, 'effect/dist/persistence/KeyValueStore.js'],
  })
  assert.deepEqual(result, { ok: true, unexpected: [] })
  assert.deepEqual(checkAppCapabilityModules({
    helper: 'persistence',
    baseline,
    modules: [...baseline, 'effect/dist/persistence/KeyValueStore.js', 'effect/dist/DateTime.js'],
  }).unexpected, ['DateTime.js'])
})

test('rejectsUnexpectedEffectModulesForEveryOtherHelper', () => {
  const spikeModules = [
    'effect/dist/DateTime.js',
    'effect/dist/Tuple.js',
    'effect/dist/http/internal/urlParams.js',
    'effect/dist/internal/redacted.js',
    'effect/dist/encoding/EncodingError.js',
  ]
  for (const capability of APP_CAPABILITIES.filter(({ helper }) => helper !== 'persistence')) {
    assert.deepEqual(checkAppCapabilityModules({ helper: capability.helper, baseline, modules: [...baseline, ...spikeModules] }).unexpected,
      ['DateTime.js', 'Tuple.js', 'encoding/EncodingError.js', 'http/internal/urlParams.js', 'internal/redacted.js'])
  }
})

test('reportsUnexpectedModulePaths with actionable DEP-1 guidance', () => {
  const result = checkAppCapabilityModules({ helper: 'resize', baseline, modules: [...baseline, '/tmp/node_modules/effect/dist/http/internal/urlParams.js'] })
  assert.equal(result.ok, false)
  const message = formatAppCapabilityModuleFailure('resize', result.unexpected)
  assert.match(message, /http\/internal\/urlParams\.js/)
  assert.match(message, /narrowest public API/i)
  assert.match(message, /DateTime and http/)
})

test('extracts effect modules from source-map module lists', () => {
  assert.deepEqual(effectModulesFromSourceMap([
    '/work/node_modules/.pnpm/effect@4.0.5/node_modules/effect/dist/DateTime.js',
    '/work/node_modules/effect/dist/http/internal/urlParams.js',
    '/work/packages/app/dist/clipboard.js',
  ]), ['DateTime.js', 'http/internal/urlParams.js'])
})

test('registered-but-missing exports fail once requireAll is enabled', () => {
  const resolved = resolveAppCapabilityAvailability({ exportedNames: new Set(['signalSubscription']) })
  assert.equal(resolved.available.length, 1)
  assert.match(resolved.missing[0]!, /^validation:/)
  assert.throws(() => resolveAppCapabilityAvailability({ exportedNames: new Set(['signalSubscription']), requireAll: true }),
    /validation: projectConstraintValidity.*helper not exported yet/)
})

test('unusedHelpersAreAbsentFromClosure', () => {
  const modules = ['/packed/node_modules/@wsagency/wseffect-app/dist/clipboard.js']
  assert.deepEqual(checkUnusedAppCapabilityModules({ helper: 'clipboard', modules }), [])
  assert.deepEqual(checkUnusedAppCapabilityModules({ helper: 'scroll', modules }), modules)
})
