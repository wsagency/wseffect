import { expect, test } from '@playwright/test'
import type { BrowserContext } from '@playwright/test'
import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { createScratchDir } from './helpers/build.ts'
import type { ServerHandle } from '../tools/serve/server.ts'
import { startStaticServer } from './helpers/server.ts'

const repository = resolve(import.meta.dirname, '..')
const gallery = process.env.GALLERY_PACKED === '1' ? repository : resolve(repository, 'apps/gallery')

function build(directory: string, buildId: string, revision?: string): void {
  const env = { ...process.env, WSEFFECT_BUILD_ID: buildId }
  if (revision === undefined) delete env.GALLERY_REVISION
  else env.GALLERY_REVISION = revision
  execFileSync('pnpm', ['--dir', gallery, 'exec', 'vite', 'build', '--outDir', directory, '--emptyOutDir'], {
    cwd: repository,
    stdio: 'pipe',
    env,
  })
}

test('deleted old assets classify skew as NewVersion and reload into the deployed build', async ({ browser }) => {
  const scratch = await createScratchDir('wseffect-e2e-skew-')
  let server: ServerHandle | undefined
  let context: BrowserContext | undefined
  try {
    const v1 = resolve(scratch, 'v1')
    const v2 = resolve(scratch, 'v2')
    build(v1, 'aaaaaaa1')
    build(v2, 'bbbbbbb2', 'r2')
    const started = await startStaticServer(v1)
    server = started.server
    context = await browser.newContext({ baseURL: `http://127.0.0.1:${started.port}`, serviceWorkers: 'block', viewport: { width: 320, height: 100 } })
    const page = await context.newPage()

    await page.goto('/')
    await page.locator('#date-input').fill('2027-03-17')
    server.deploy(v2, { retain: 1 })
    await page.locator('#link-tabs').click()
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
  const scratch = await createScratchDir('wseffect-e2e-skew-')
  let server: ServerHandle | undefined
  let context: BrowserContext | undefined
  try {
    const v1 = resolve(scratch, 'v1')
    const v2 = resolve(scratch, 'v2')
    build(v1, 'aaaaaaa1')
    build(v2, 'bbbbbbb2', 'r2')
    const started = await startStaticServer(v1)
    server = started.server
    context = await browser.newContext({ baseURL: `http://127.0.0.1:${started.port}`, serviceWorkers: 'block', viewport: { width: 320, height: 100 } })
    const page = await context.newPage()

    await page.goto('/')
    await page.locator('#date-input').fill('2027-03-17')
    server.deploy(v2)
    await page.locator('#link-tabs').click()
    await expect(page.getByRole('heading', { name: 'Tabs' })).toBeVisible()
    await expect(page.getByText('Gallery revision r1', { exact: true })).toBeVisible()
    await expect(page.locator('#date-shell')).toHaveText('2027-03-17')
  } finally {
    await context?.close()
    await server?.close()
    await rm(scratch, { recursive: true, force: true })
  }
})

test('visible-tab version polling detects a deployment without changing the default interval', async ({ browser }) => {
  const scratch = await createScratchDir('wseffect-e2e-skew-')
  let server: ServerHandle | undefined
  let context: BrowserContext | undefined
  try {
    const v1 = resolve(scratch, 'v1')
    const v2 = resolve(scratch, 'v2')
    build(v1, 'aaaaaaa1')
    build(v2, 'bbbbbbb2', 'r2')
    const started = await startStaticServer(v1)
    server = started.server
    context = await browser.newContext({ baseURL: `http://127.0.0.1:${started.port}`, serviceWorkers: 'block', viewport: { width: 320, height: 100 } })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.locator('#build-id')).toHaveText('aaaaaaa1')
    server.deploy(v2)

    const secondPage = await context.newPage()
    await secondPage.goto('/')
    await page.bringToFront()
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await expect(page.locator('#wseffect-update')).toBeVisible()
  } finally {
    await context?.close()
    await server?.close()
    await rm(scratch, { recursive: true, force: true })
  }
})
