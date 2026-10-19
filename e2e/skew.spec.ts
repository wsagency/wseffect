import { expect, test } from '@playwright/test'
import type { BrowserContext } from '@playwright/test'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import type { ServerHandle } from '../tools/serve/server.ts'
import { startStaticServer } from './helpers/server.ts'

const repository = resolve(import.meta.dirname, '..')
const gallery = resolve(repository, 'apps/gallery')

async function cacheScratch(): Promise<string> {
  const home = process.env.HOME
  if (home === undefined) throw new Error('HOME is required to place E2E scratch under ~/.cache')
  const cache = resolve(home, '.cache')
  await mkdir(cache, { recursive: true })
  return mkdtemp(resolve(cache, 'wseffect-e2e-skew-'))
}

function build(directory: string, buildId: string, revision?: string): void {
  execFileSync('pnpm', ['--dir', gallery, 'exec', 'vite', 'build', '--outDir', directory, '--emptyOutDir'], {
    cwd: repository,
    stdio: 'pipe',
    env: { ...process.env, WSEFFECT_BUILD_ID: buildId, ...(revision === undefined ? {} : { GALLERY_REVISION: revision }) },
  })
}

test('deleted old assets classify skew as NewVersion and reload into the deployed build', async ({ browser }) => {
  const scratch = await cacheScratch()
  let server: ServerHandle | undefined
  let context: BrowserContext | undefined
  try {
    const v1 = resolve(scratch, 'v1')
    const v2 = resolve(scratch, 'v2')
    build(v1, 'aaaaaaa1')
    build(v2, 'bbbbbbb2', 'r2')
    const started = await startStaticServer(v1)
    server = started.server
    context = await browser.newContext({ baseURL: `http://127.0.0.1:${started.port}`, serviceWorkers: 'block' })
    const page = await context.newPage()

    await page.goto('/')
    await page.locator('#date-input').fill('2027-03-17')
    await page.goto('/tabs')
    server.deploy(v2, { retain: 1 })
    await expect(page.locator('#failed-tabs[data-cause="NewVersion"]')).toBeVisible()
    await page.locator('#reload-tabs').click()
    await expect(page.locator('#build-id')).toHaveText('bbbbbbb2')
    await expect(page.getByRole('heading', { name: 'Tabs' })).toBeVisible()
    await expect(page.getByText('Gallery revision r2', { exact: true })).toBeVisible()
  } finally {
    await context?.close()
    await server?.close()
    await rm(scratch, { recursive: true, force: true })
  }
})

test('default asset retention keeps the old lazy page and its shell state usable', async ({ browser }) => {
  const scratch = await cacheScratch()
  let server: ServerHandle | undefined
  let context: BrowserContext | undefined
  try {
    const v1 = resolve(scratch, 'v1')
    const v2 = resolve(scratch, 'v2')
    build(v1, 'aaaaaaa1')
    build(v2, 'bbbbbbb2', 'r2')
    const started = await startStaticServer(v1)
    server = started.server
    context = await browser.newContext({ baseURL: `http://127.0.0.1:${started.port}`, serviceWorkers: 'block' })
    const page = await context.newPage()

    await page.goto('/')
    await page.locator('#date-input').fill('2027-03-17')
    await page.goto('/tabs')
    server.deploy(v2)
    await expect(page.getByRole('heading', { name: 'Tabs' })).toBeVisible()
    await expect(page.getByText('Gallery revision r1', { exact: true })).toBeVisible()
  } finally {
    await context?.close()
    await server?.close()
    await rm(scratch, { recursive: true, force: true })
  }
})

test('visible-tab version polling detects a deployment without changing the default interval', async ({ browser }) => {
  const scratch = await cacheScratch()
  let server: ServerHandle | undefined
  let context: import('@playwright/test').BrowserContext | undefined
  try {
    const v1 = resolve(scratch, 'v1')
    const v2 = resolve(scratch, 'v2')
    build(v1, 'aaaaaaa1')
    build(v2, 'bbbbbbb2', 'r2')
    const started = await startStaticServer(v1)
    server = started.server
    context = await browser.newContext({ baseURL: `http://127.0.0.1:${started.port}`, serviceWorkers: 'block' })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.locator('#build-id')).toHaveText('aaaaaaa1')
    server.deploy(v2)

    const secondPage = await context.newPage()
    await secondPage.goto('/')
    await page.bringToFront()
    await expect(page.locator('#wseffect-update')).toBeVisible()
  } finally {
    await context?.close()
    await server?.close()
    await rm(scratch, { recursive: true, force: true })
  }
})
