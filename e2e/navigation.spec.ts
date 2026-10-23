import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { galleryPageAssets } from './helpers/build.ts'

const countRequests = (page: Page, key: string, asset: string, counts: Record<string, number>): void => {
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === asset) counts[key] = (counts[key] ?? 0) + 1
  })
}

const waitForDelay = async (milliseconds: number): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, milliseconds)
  await promise
}

const clickRouteLink = async (page: Page, key: string): Promise<void> => {
  const link = page.locator(`#link-${key}`)
  await link.evaluate((element) => element.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' }))
  await link.click()
}

test('deep links load only the pages for their route', async ({ page }) => {
  const assets = await galleryPageAssets(['sharedA', 'sharedB', 'dialog'])
  const requests: string[] = []
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname
    if (Object.values(assets).includes(pathname)) requests.push(pathname)
  })
  await page.setViewportSize({ width: 320, height: 100 })
  await page.goto('/shared')
  await expect(page.locator('#date-page-sharedA')).toBeVisible()
  await expect(page.locator('#date-page-sharedB')).toBeVisible()
  expect(requests).toContain(assets.sharedA)
  expect(requests).toContain(assets.sharedB)
  expect(requests).not.toContain(assets.dialog)

  requests.length = 0
  await page.goto('/dialog')
  await expect(page.getByRole('heading', { name: 'Dialog', exact: true })).toBeVisible()
  expect(requests).toContain(assets.dialog)
  expect(requests).not.toContain(assets.sharedA)
  expect(requests).not.toContain(assets.sharedB)
})

test('back and forward retain shared page state and fetch each chunk once', async ({ page }) => {
  const assets = await galleryPageAssets(['sharedA', 'sharedB', 'dialog'])
  const counts: Record<string, number> = {}
  for (const key of ['sharedA', 'sharedB', 'dialog']) countRequests(page, key, assets[key]!, counts)
  await page.goto('/shared')
  await expect(page.locator('#sharedA-note')).toHaveText('(none)')
  await page.locator('#sharedA-add-note').click()
  await expect(page.locator('#sharedA-note')).toHaveText('A shared note')
  await page.getByRole('link', { name: 'dialog', exact: true }).click()
  await expect(page).toHaveURL(/\/dialog$/)
  await expect(page.getByRole('heading', { name: 'Dialog', exact: true })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/shared$/)
  await expect(page.locator('#sharedA-note')).toHaveText('A shared note')
  await page.goForward()
  await expect(page).toHaveURL(/\/dialog$/)
  await expect(page.getByRole('heading', { name: 'Dialog', exact: true })).toBeVisible()
  expect(counts).toEqual({ sharedA: 1, sharedB: 1, dialog: 1 })
})

test('dialog-tabs-dialog navigation interrupts the tabs load and fetches each page chunk once', async ({ page }, testInfo) => {
  const assets = await galleryPageAssets(['dialog', 'tabs'])
  const devServer = testInfo.project.name === 'devNavigation'
  const chunkPaths = {
    dialog: devServer ? '/src/pages/dialog.ts' : assets.dialog!,
    tabs: devServer ? '/src/pages/tabs.ts' : assets.tabs!,
  }
  const counts: Record<string, number> = {}
  for (const key of ['dialog', 'tabs'] as const) countRequests(page, key, chunkPaths[key], counts)
  await page.route((url) => url.pathname === chunkPaths.tabs, async (route) => {
    await waitForDelay(1_200)
    await route.continue()
  })
  const tabsRequest = page.waitForRequest((request) => new URL(request.url()).pathname === chunkPaths.tabs)
  await page.setViewportSize({ width: 320, height: 100 })
  await page.goto('/')
  await clickRouteLink(page, 'dialog')
  await expect(page.getByRole('heading', { name: 'Dialog', exact: true })).toBeVisible()
  if (devServer) {
    await page.evaluate(() => {
      const messages = (window as Window & { __wseffectMessages?: Array<{ readonly _tag: string }> }).__wseffectMessages
      if (messages === undefined) throw new Error('DEV message instrumentation is unavailable')
      messages.length = 0
    })
  }
  await clickRouteLink(page, 'tabs')
  await tabsRequest
  await clickRouteLink(page, 'dialog')
  await expect(page.getByRole('heading', { name: 'Dialog', exact: true })).toBeVisible()
  expect(counts).toEqual({ dialog: 1, tabs: 1 })
  await expect(page.getByRole('heading', { name: 'Tabs' })).toHaveCount(0)
  await expect(page.locator('#loading-tabs')).toHaveCount(0)
  if (devServer) {
    expect(await page.evaluate(() => {
      const messages = (window as Window & { __wseffectMessages?: Array<{ readonly _tag: string; readonly key?: string }> }).__wseffectMessages
      if (messages === undefined) throw new Error('DEV message instrumentation is unavailable')
      return messages.filter((message) => message._tag === 'LoadedPageModule' && message.key === 'tabs')
    })).toHaveLength(0)
  }
})


