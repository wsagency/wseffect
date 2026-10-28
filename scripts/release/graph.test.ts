import assert from 'node:assert/strict'
import test from 'node:test'
import { releaseOrder, type PackageManifest } from './graph.ts'

const manifest = (
  name: string,
  fields: Pick<PackageManifest, 'dependencies' | 'peerDependencies' | 'devDependencies'> = {},
): PackageManifest => ({ name, ...fields })

test('ordersDependencyBeforeConsumer', () => {
  const result = releaseOrder([
    manifest('consumer', { dependencies: { dependency: 'workspace:*' } }),
    manifest('dependency'),
  ])

  assert.deepEqual(result.order, ['dependency', 'consumer'])
  assert.deepEqual(result.edges, [{ from: 'dependency', to: 'consumer' }])
})

test('includesPeerAndDependencyEdges', () => {
  const result = releaseOrder([
    manifest('consumer', {
      dependencies: { dependency: 'workspace:*' },
      peerDependencies: { peer: 'workspace:*' },
    }),
    manifest('peer'),
    manifest('dependency'),
  ])

  assert.deepEqual(result.order, ['dependency', 'peer', 'consumer'])
  assert.deepEqual(result.edges, [
    { from: 'dependency', to: 'consumer' },
    { from: 'peer', to: 'consumer' },
  ])
})

test('rejectsMissingInternalPackage', () => {
  assert.throws(
    () => releaseOrder([manifest('consumer', { dependencies: { absent: 'workspace:*' } })]),
    /missing.*absent.*consumer/i,
  )
})

test('rejectsCycle', () => {
  assert.throws(
    () => releaseOrder([
      manifest('first', { dependencies: { second: 'workspace:*' } }),
      manifest('second', { dependencies: { first: 'workspace:*' } }),
    ]),
    /cycle/i,
  )
})

test('stableOrdersIndependentPackages', () => {
  const result = releaseOrder([manifest('zeta'), manifest('alpha'), manifest('middle')])

  assert.deepEqual(result.order, ['alpha', 'middle', 'zeta'])
})

test('ignoresDevelopmentWorkspaceEdges', () => {
  const result = releaseOrder([
    manifest('consumer', { devDependencies: { devOnly: 'workspace:*' } }),
  ])

  assert.deepEqual(result.order, ['consumer'])
  assert.deepEqual(result.edges, [])
})
