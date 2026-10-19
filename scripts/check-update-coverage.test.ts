import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { findUpdateModules, uncoveredFunctions } from './check-update-coverage.ts'

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
