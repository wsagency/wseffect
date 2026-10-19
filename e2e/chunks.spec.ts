import { expect, test } from '@playwright/test'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import type { ServerHandle } from '../tools/serve/server.ts'
import { startStaticServer } from './helpers/server.ts'

const repository = resolve(import.meta.dirname, '..')
const gallery = resolve(repository, 'apps/gallery')
const tabsPath = resolve(gallery, 'src/pages/tabs.ts')

async function assetNames(directory: string): Promise<ReadonlyArray<string>> {
  return (await readdir(resolve(directory, 'assets'))).sort()
}

test('fixed build IDs preserve every asset name except the changed page chunk', async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'build fixture mutates shared page source; run once')
  const source = await readFile(tabsPath)
  const home = process.env.HOME
  if (home === undefined) throw new Error('HOME is required to place E2E scratch under ~/.cache')
  const cache = resolve(home, '.cache')
  await mkdir(cache, { recursive: true })
  const scratch = await mkdtemp(resolve(cache, 'wseffect-e2e-chunks-'))
  const first = resolve(scratch, 'first')
  const second = resolve(scratch, 'second')
  let server: ServerHandle | undefined
  try {
    const build = (outDir: string): void => execFileSync('pnpm', [
      '--dir', gallery,
      'exec', 'vite', 'build', '--outDir', outDir, '--emptyOutDir',
    ], {
      cwd: repository,
      stdio: 'pipe',
      env: { ...process.env, WSEFFECT_BUILD_ID: 'd3a1234' },
    })
    build(first)
    await writeFile(tabsPath, Buffer.concat([source, Buffer.from('\n')]))
    build(second)
    const before = new Set(await assetNames(first))
    const after = new Set(await assetNames(second))
    const changedNames = [...before].filter((name) => !after.has(name)).length
      + [...after].filter((name) => !before.has(name)).length
    expect(changedNames).toBe(2)

    const started = await startStaticServer(second)
    server = started.server
    const response = await fetch(`http://127.0.0.1:${started.port}/`)
    expect(response.status).toBe(200)
  } finally {
    await writeFile(tabsPath, source)
    await server?.close()
    await rm(scratch, { recursive: true, force: true })
  }
})

