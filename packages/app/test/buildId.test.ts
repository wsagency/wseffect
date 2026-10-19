import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { computeBuildId } from '../src/codegen/buildId.js'

const roots: Array<string> = []

async function workspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'wseffect-build-id-'))
  roots.push(root)
  await mkdir(join(root, 'apps/app/src'), { recursive: true })
  await mkdir(join(root, 'packages/lib/src'), { recursive: true })
  await mkdir(join(root, 'packages/lib/dist'), { recursive: true })
  await mkdir(join(root, 'packages/lib/test'), { recursive: true })
  await writeFile(join(root, 'pnpm-workspace.yaml'), 'packages: [apps/*, packages/*]\n')
  await writeFile(join(root, 'pnpm-lock.yaml'), `lockfileVersion: '9.0'\nimporters:\n  apps/app:\n    dependencies:\n      lib:\n        specifier: workspace:*\n        version: link:../../packages/lib\n  packages/lib: {}\n`)
  await writeFile(join(root, 'apps/app/package.json'), JSON.stringify({ dependencies: { lib: 'workspace:*' } }))
  await writeFile(join(root, 'apps/app/src/app.ts'), 'export const value = 1\n')
  await writeFile(join(root, 'packages/lib/package.json'), JSON.stringify({ name: 'lib' }))
  await writeFile(join(root, 'packages/lib/src/lib.ts'), 'export const value = 1\n')
  await writeFile(join(root, 'packages/lib/dist/lib.js'), 'export const value = 1\n')
  await writeFile(join(root, 'packages/lib/test/lib.test.ts'), 'test only\n')
  execFileSync('git', ['init', '-q'], { cwd: root })
  execFileSync('git', ['add', '.'], { cwd: root })
  return root
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('build ID', () => {
  it('is stable, changes with app and linked package source and lockfile, but ignores tests and dist', async () => {
    const root = await workspace()
    const input = { appRoot: 'apps/app', workspaceRoot: root, env: {} }
    const initial = computeBuildId(input)
    expect(initial).toMatch(/^[0-9a-f]{64}$/)
    expect(computeBuildId(input)).toBe(initial)
    await writeFile(join(root, 'apps/app/src/app.ts'), 'export const value = 2\n')
    const appChanged = computeBuildId(input)
    expect(appChanged).not.toBe(initial)
    await writeFile(join(root, 'apps/app/src/app.ts'), 'export const value = 1\n')
    await writeFile(join(root, 'packages/lib/src/lib.ts'), 'export const value = 2\n')
    const libChanged = computeBuildId(input)
    expect(libChanged).not.toBe(initial)
    await writeFile(join(root, 'packages/lib/src/lib.ts'), 'export const value = 1\n')
    await writeFile(join(root, 'packages/lib/dist/lib.js'), 'dist changed\n')
    await writeFile(join(root, 'packages/lib/test/lib.test.ts'), 'test changed\n')
    expect(computeBuildId(input)).toBe(initial)
    await writeFile(join(root, 'pnpm-lock.yaml'), 'lockfileVersion: changed\n')
    expect(computeBuildId(input)).not.toBe(initial)
  })

  it('honors only valid explicit lowercase build IDs', async () => {
    const root = await workspace()
    expect(computeBuildId({ appRoot: 'apps/app', workspaceRoot: root, env: { WSEFFECT_BUILD_ID: 'abc1234' } })).toBe('abc1234')
    expect(() => computeBuildId({ appRoot: 'apps/app', workspaceRoot: root, env: { WSEFFECT_BUILD_ID: 'ABC' } }))
      .toThrow('WSEFFECT_BUILD_ID must match ^[0-9a-f]{7,64}$')
  })

  it('uses path, NUL, decimal length, NUL, and file bytes in the digest', async () => {
    const root = await mkdtemp(join(tmpdir(), 'wseffect-build-hash-'))
    roots.push(root)
    await mkdir(join(root, 'src'), { recursive: true })
    await writeFile(join(root, 'src/a.ts'), 'value')
    await writeFile(join(root, 'pnpm-lock.yaml'), 'lock\n')
    execFileSync('git', ['init', '-q'], { cwd: root })
    execFileSync('git', ['add', '.'], { cwd: root })
    expect(computeBuildId({ appRoot: '.', workspaceRoot: root, env: {} }))
      .toBe('6f7adf1b92794da601d7efbaffd1abd829a0bad977ef26e1228c0e4bc16aed5a')
  })
})
