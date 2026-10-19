import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
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
  await mkdir(join(root, 'packages/lib/tests'), { recursive: true })
  await writeFile(join(root, 'pnpm-workspace.yaml'), 'packages: [apps/*, packages/*]\n')
  await writeFile(join(root, 'pnpm-lock.yaml'), `lockfileVersion: '9.0'\nimporters:\n  apps/app:\n    dependencies:\n      lib:\n        specifier: workspace:*\n        version: link:../../packages/lib\n  packages/lib: {}\n`)
  await mkdir(join(root, 'apps/app/public'), { recursive: true })
  await mkdir(join(root, 'packages/lib/scripts'), { recursive: true })
  await writeFile(join(root, 'apps/app/index.html'), '<main>app</main>\n')
  await writeFile(join(root, 'apps/app/public/icon.svg'), '<svg />\n')
  await writeFile(join(root, 'apps/app/vite.config.ts'), 'export default {}\n')
  await writeFile(join(root, 'apps/app/package.json'), JSON.stringify({ dependencies: { lib: 'workspace:*' } }))
  await writeFile(join(root, 'apps/app/src/app.ts'), 'export const value = 1\n')
  await writeFile(join(root, 'packages/lib/package.json'), JSON.stringify({ name: 'lib' }))
  await writeFile(join(root, 'packages/lib/src/lib.ts'), 'export const value = 1\n')
  await writeFile(join(root, 'packages/lib/scripts/build-css.js'), 'build css v1\n')
  await writeFile(join(root, 'packages/lib/scripts/build.test.json'), 'test only\n')
  await writeFile(join(root, 'packages/lib/dist/lib.js'), 'export const value = 1\n')
  await writeFile(join(root, 'packages/lib/test/lib.test.ts'), 'test only\n')
  await writeFile(join(root, 'packages/lib/tests/ignored.json'), 'test only\n')
  await writeFile(join(root, 'apps/app/e2e.test.ts'), 'test only\n')
  await writeFile(join(root, 'apps/app/vitest.config.ts'), 'unrelated config\n')
  execFileSync('git', ['init', '-q'], { cwd: root })
  execFileSync('git', ['add', '.'], { cwd: root })
  return root
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('build ID', () => {
  it('hashes app HTML/assets/config and linked package build inputs, but ignores tests and dist', async () => {
    const root = await workspace()
    const input = { appRoot: 'apps/app', workspaceRoot: root, env: {} }
    const initial = computeBuildId(input)
    expect(initial).toMatch(/^[0-9a-f]{64}$/)
    expect(computeBuildId(input)).toBe(initial)

    for (const [path, changed] of [
      ['apps/app/index.html', '<main>changed</main>\n'],
      ['apps/app/public/icon.svg', '<svg>changed</svg>\n'],
      ['apps/app/vite.config.ts', 'export default { mode: "changed" }\n'],
      ['packages/lib/scripts/build-css.js', 'build css v2\n'],
      ['pnpm-lock.yaml', 'lockfileVersion: changed\n'],
    ] as const) {
      const original = await readFile(join(root, path), 'utf8')
      await writeFile(join(root, path), changed)
      expect(computeBuildId(input), `${path} should affect the build ID`).not.toBe(initial)
      await writeFile(join(root, path), original)
      expect(computeBuildId(input)).toBe(initial)
    }

    await writeFile(join(root, 'apps/app/src/app.ts'), 'export const value = 2\n')
    expect(computeBuildId(input)).not.toBe(initial)
    await writeFile(join(root, 'apps/app/src/app.ts'), 'export const value = 1\n')
    await writeFile(join(root, 'packages/lib/src/lib.ts'), 'export const value = 2\n')
    expect(computeBuildId(input)).not.toBe(initial)
    await writeFile(join(root, 'packages/lib/src/lib.ts'), 'export const value = 1\n')

    await writeFile(join(root, 'packages/lib/dist/lib.js'), 'dist changed\n')
    await writeFile(join(root, 'packages/lib/test/lib.test.ts'), 'test changed\n')
    await writeFile(join(root, 'packages/lib/scripts/build.test.json'), 'test changed\n')
    await writeFile(join(root, 'packages/lib/tests/ignored.json'), 'test changed\n')
    await writeFile(join(root, 'apps/app/e2e.test.ts'), 'test changed\n')
    await writeFile(join(root, 'apps/app/vitest.config.ts'), 'unrelated config changed\n')
    expect(computeBuildId(input)).toBe(initial)
  })

  it('hashes sorted path, NUL, decimal length, NUL, and bytes including the lockfile and Vite config in path order', async () => {
    const root = await mkdtemp(join(tmpdir(), 'wseffect-build-hash-'))
    roots.push(root)
    await mkdir(join(root, 'src'), { recursive: true })
    await writeFile(join(root, 'src/a.ts'), 'value')
    await writeFile(join(root, 'pnpm-lock.yaml'), 'lock\n')
    await writeFile(join(root, 'vite.config.ts'), 'config\n')
    execFileSync('git', ['init', '-q'], { cwd: root })
    execFileSync('git', ['add', '.'], { cwd: root })
    const expected = createHash('sha256')
    for (const [path, bytes] of [
      ['pnpm-lock.yaml', 'lock\n'],
      ['src/a.ts', 'value'],
      ['vite.config.ts', 'config\n'],
    ] as const) {
      expected.update(path)
      expected.update('\0')
      expected.update(String(Buffer.byteLength(bytes)))
      expected.update('\0')
      expected.update(bytes)
    }
    expect(computeBuildId({ appRoot: '.', workspaceRoot: root, env: {} })).toBe(expected.digest('hex'))
  })

  it('explains that WSEFFECT_BUILD_ID is the alternative when git or the lockfile is unavailable', async () => {
    const noGit = await mkdtemp(join(tmpdir(), 'wseffect-build-no-git-'))
    roots.push(noGit)
    await writeFile(join(noGit, 'pnpm-lock.yaml'), 'lock\n')
    expect(() => computeBuildId({ appRoot: '.', workspaceRoot: noGit, env: {} })).toThrow('WSEFFECT_BUILD_ID')

    const noLock = await workspace()
    await rm(join(noLock, 'pnpm-lock.yaml'))
    expect(() => computeBuildId({ appRoot: 'apps/app', workspaceRoot: noLock, env: {} })).toThrow('WSEFFECT_BUILD_ID')
  })

  it('honors only valid explicit lowercase build IDs', async () => {
    const root = await workspace()
    expect(computeBuildId({ appRoot: 'apps/app', workspaceRoot: root, env: { WSEFFECT_BUILD_ID: 'abc1234' } })).toBe('abc1234')
    expect(() => computeBuildId({ appRoot: 'apps/app', workspaceRoot: root, env: { WSEFFECT_BUILD_ID: 'ABC' } }))
      .toThrow('WSEFFECT_BUILD_ID must match ^[0-9a-f]{7,64}$')
  })

})
