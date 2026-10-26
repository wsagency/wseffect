import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import {
  findCoverageFiles,
  findUpdateModules,
  isUpdateCoverageSource,
  uncoveredFunctions,
} from './check-update-coverage.ts'

test(
  'update coverage includes locally absorbed Foldkit UI state machines only',
  () => {
    const source = (path: string) => `/repo/packages/foldkit-ui/src/${path}`
    for (const path of [
      'menu/context.ts',
      'menu/index.ts',
      'tooltip/group.ts',
      'slider/range.ts',
      'anchor/anchor.ts',
      'listbox/shared.ts',
      'listboxSelect/index.ts',
      'virtualList/index.ts',
      'checkboxGroup/index.ts',
    ]) assert.equal(isUpdateCoverageSource(source(path)), true)
    assert.equal(isUpdateCoverageSource(source('listbox/single.ts')), false)
    assert.equal(isUpdateCoverageSource(source('slider/range.test.ts')), false)
  },
)

test(
  'update coverage scans wseffect sources, not vendored Foldkit or test fixtures',
  () => {
    const source = (packageName: string, path: string) =>
      `/repo/packages/${packageName}/src/${path}`
    assert.equal(isUpdateCoverageSource(source('themes', 'update/update.ts')), true)
    assert.equal(isUpdateCoverageSource(source('foldkit', 'update/update.ts')), false)
    assert.equal(isUpdateCoverageSource(source('foldkit-ui', 'toast/update.ts')), false)
    assert.equal(isUpdateCoverageSource(source('vite-plugin', 'index.ts')), false)
    assert.equal(isUpdateCoverageSource(source('themes', 'test/apps/counter.ts')), false)
    assert.equal(isUpdateCoverageSource(source('themes', 'update/update.test.ts')), false)
  },
)

test('findUpdateModules selects exported update declarations only', (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'wseffect-update-'))
  context.after(() => rmSync(directory, { recursive: true, force: true }))
  const updatePath = join(directory, 'a.ts')
  const viewPath = join(directory, 'b.ts')
  writeFileSync(updatePath, 'export const update = () => {}')
  writeFileSync(viewPath, 'export const view = () => {}')
  assert.deepEqual(findUpdateModules([updatePath, viewPath]).map((path) => basename(path)), ['a.ts'])
})

test('findUpdateModules detects function and re-export declarations', (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'wseffect-update-'))
  context.after(() => rmSync(directory, { recursive: true, force: true }))
  const functionPath = join(directory, 'a.ts')
  const reexportPath = join(directory, 'b.ts')
  writeFileSync(functionPath, 'export function update() {}')
  writeFileSync(reexportPath, 'const update = () => {}; export { update }')
  assert.deepEqual(findUpdateModules([functionPath, reexportPath]).map((path) => basename(path)), ['a.ts', 'b.ts'])
})

test('findUpdateModules includes exported kit update and binding factories', (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'wseffect-update-'))
  context.after(() => rmSync(directory, { recursive: true, force: true }))
  const updatePath = join(directory, 'update.ts')
  const bindingPath = join(directory, 'binding.ts')
  writeFileSync(updatePath, 'export function makeKitUpdate(): Update.Return { return update }')
  writeFileSync(bindingPath, 'export const bindKit = () => {}')
  assert.deepEqual(findUpdateModules([updatePath, bindingPath]), [updatePath, bindingPath])
})

test('uncoveredFunctions reports update modules missing from coverage', () => {
  const updatePath = `${process.cwd()}/packages/app/src/kit/update.ts`
  assert.deepEqual(uncoveredFunctions({}, [updatePath]), [
    'packages/app/src/kit/update.ts:missing coverage',
  ])
})

test('findCoverageFiles skips dependency and git directories', async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'wseffect-coverage-'))
  context.after(() => rmSync(directory, { recursive: true, force: true }))
  for (const name of ['coverage', 'node_modules', '.git']) {
    const nested = join(directory, name)
    mkdirSync(nested, { recursive: true })
    writeFileSync(join(nested, 'coverage-final.json'), '{}')
  }
  assert.deepEqual((await findCoverageFiles(directory)).map((path) => basename(path)), ['coverage-final.json'])
})
test('uncoveredFunctions reports uncovered function names in update modules', () => {
  const updatePath = `${process.cwd()}/packages/app/src/kit/update.ts`
  const viewPath = `${process.cwd()}/packages/app/src/kit/view.ts`
  const coverage = {
    [updatePath]: {
      f: { '0': 1, '1': 0 },
      fnMap: { '0': { name: 'update', line: 4 }, '1': { name: 'handleEntry', line: 9 } },
    },
    [viewPath]: {
      f: { '0': 0 },
      fnMap: { '0': { name: 'view', line: 2 } },
    },
  }
  assert.deepEqual(uncoveredFunctions(coverage, [updatePath]), [
    'packages/app/src/kit/update.ts:handleEntry',
  ])
})
