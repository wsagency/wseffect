import { expect, test } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'
import { readdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { createScratchDir } from './helpers/build.ts'
import type { ServerHandle } from '../tools/serve/server.ts'
import { startStaticServer } from './helpers/server.ts'

const repository = resolve(import.meta.dirname, '..')
const gallery = resolve(repository, 'apps/gallery')

type Build = { readonly directory: string; readonly javascript: ReadonlySet<string> }

async function build(directory: string, buildId: string, revision?: string): Promise<Build> {
  const env = { ...process.env, WSEFFECT_BUILD_ID: buildId }
  if (revision === undefined) delete env.GALLERY_REVISION
  else env.GALLERY_REVISION = revision
  execFileSync('pnpm', ['--dir', gallery, 'exec', 'vite', 'build', '--outDir', directory, '--emptyOutDir'], {
    cwd: repository,
    stdio: 'pipe',
    env,
  })
  const javascript = new Set((await readdir(resolve(directory, 'assets'))).filter((name) => name.endsWith('.js')))
  return { directory, javascript }
}

function requestedJavascript(page: Page, builds: ReadonlyArray<Build>): ReadonlyArray<string> {
  const assets = new Set(builds.flatMap(({ javascript }) => [...javascript]))
  const requests: string[] = []
  page.on('request', (request) => {
    const name = new URL(request.url()).pathname.split('/').at(-1)
    if (name !== undefined && assets.has(name)) requests.push(name)
  })
  return requests
}

test('PWA service-worker precaches primary chunks and serves visited and primary pages offline', async ({ browser }) => {
  const scratch = await createScratchDir('wseffect-e2e-pwa-')
  let server: ServerHandle | undefined
  let context: BrowserContext | undefined
  try {
    const v1 = await build(resolve(scratch, 'v1'), 'aaaaaaa1')
    const started = await startStaticServer(v1.directory)
    server = started.server
    context = await browser.newContext({
      baseURL: `http://127.0.0.1:${started.port}`,
      viewport: { width: 320, height: 100 },
    })
    const page = await context.newPage()
    const scripts = requestedJavascript(page, [v1])

    await page.goto('/')
    await expect(page.locator('#date-shell')).toBeVisible()
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready
      if (registration.active === null) throw new Error('service worker did not activate')
      if (navigator.serviceWorker.controller === null) {
        await new Promise<void>((resolve) => {
          navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })
        })
      }
    })
    const precache = await page.evaluate(async () => {
      const names = await caches.keys()
      const cacheName = names.find((name) => name.startsWith('workbox-precache'))
      if (cacheName === undefined) throw new Error(`precache not found: ${names.join(', ')}`)
      return (await (await caches.open(cacheName)).keys()).map((request) => new URL(request.url).pathname)
    })
    expect(precache).toContain('/index.html')
    expect(precache.some((url) => /\/assets\/index-[^/]+\.js$/.test(url))).toBe(true)
    expect(precache.some((url) => /\/assets\/framework-[^/]+\.js$/.test(url))).toBe(true)
    for (const pageKey of ['layout', 'typography', 'buttons', 'dialog']) {
      expect(precache.some((url) => new RegExp(`/assets/${pageKey}-[^/]+\\.js$`).test(url))).toBe(true)
    }
    expect(precache.some((url) => /\/assets\/tabs-[^/]+\.js$/.test(url))).toBe(false)

    await page.goto('/tabs')
    await expect(page.getByRole('heading', { name: 'Tabs' })).toBeVisible()
    await expect(page.getByText('Gallery revision r1', { exact: true })).toBeVisible()
    await expect.poll(async () => page.evaluate(async () => {
      const cache = await caches.open('wseffect-pages')
      return (await cache.keys()).some((request) => /\/assets\/tabs-[^/]+\.js$/.test(new URL(request.url).pathname))
    })).toBe(true)
    await page.waitForLoadState('networkidle')
    expect(scripts.some((name) => /^cards-/.test(name))).toBe(false)
    const cachedCards = await page.evaluate(async () => {
      const cache = await caches.open('wseffect-pages')
      return (await cache.keys()).some((request) => /\/assets\/cards-[^/]+\.js$/.test(new URL(request.url).pathname))
    })
    expect(cachedCards).toBe(false)

    await context.setOffline(true)
    await page.reload()
    await expect(page.locator('#date-shell')).toBeVisible()
    await page.goto('/tabs')
    await expect(page.getByRole('heading', { name: 'Tabs' })).toBeVisible()
    await page.goto('/layout')
    await expect(page.getByRole('heading', { name: 'Layout', exact: true })).toBeVisible()
    await page.goto('/dialog')
    await expect(page.getByRole('heading', { name: 'Dialog', exact: true })).toBeVisible()
    await page.goto('/cards')
    await expect(page.locator('#failed-cards[data-cause="Offline"]')).toBeVisible()
    expect(scripts.length).toBeGreaterThan(0)
    expect(scripts.every((name) => v1.javascript.has(name))).toBe(true)
  } finally {
    await context?.close()
    await server?.close()
    await rm(scratch, { recursive: true, force: true })
  }
})

test('PWA service-worker update stays pending until accepted and reloads the new build', async ({ browser }) => {
  const scratch = await createScratchDir('wseffect-e2e-pwa-')
  let server: ServerHandle | undefined
  let context: BrowserContext | undefined
  try {
    const v1 = await build(resolve(scratch, 'v1'), 'aaaaaaa1')
    const v2 = await build(resolve(scratch, 'v2'), 'bbbbbbb2', 'r2')
    const started = await startStaticServer(v1.directory)
    server = started.server
    context = await browser.newContext({ baseURL: `http://127.0.0.1:${started.port}` })
    const page = await context.newPage()
    const scripts = requestedJavascript(page, [v1, v2])

    await page.goto('/')
    await expect(page.locator('#build-id')).toHaveText('aaaaaaa1')
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
      if (navigator.serviceWorker.controller === null) {
        await new Promise<void>((resolve) => {
          navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })
        })
      }
    })
    server.deploy(v2.directory)
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready
      await registration.update()
    })
    await expect(page.locator('#wseffect-update')).toBeVisible()
    await page.reload()
    await expect(page.locator('#build-id')).toHaveText('aaaaaaa1')
    expect(scripts.length).toBeGreaterThan(0)
    expect(scripts.every((name) => v1.javascript.has(name))).toBe(true)

    const acceptedPhaseStart = scripts.length
    await page.locator('#wseffect-update-reload').click()
    await expect(page.locator('#build-id')).toHaveText('bbbbbbb2')
    await page.goto('/tabs')
    await expect(page.getByText('Gallery revision r2', { exact: true })).toBeVisible()
    const acceptedBuildRequests = scripts.slice(acceptedPhaseStart)
    expect(acceptedBuildRequests.length).toBeGreaterThan(0)
    expect(acceptedBuildRequests.every((name) => v2.javascript.has(name))).toBe(true)
  } finally {
    await context?.close()
    await server?.close()
    await rm(scratch, { recursive: true, force: true })
  }
})
