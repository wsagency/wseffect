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

test('delayed dialog-tabs-dialog navigation fetches each page once and ends on dialog', async ({ page }) => {
  const assets = await galleryPageAssets(['dialog', 'tabs'])
  const counts: Record<string, number> = {}
  for (const key of ['dialog', 'tabs']) {
    countRequests(page, key, assets[key]!, counts)
    await page.route((url) => url.pathname === assets[key], async (route) => {
      await waitForDelay(600)
      await route.continue()
    })
  }
  await page.goto('/')
  await page.locator('#link-dialog').click()
  await expect(page.getByRole('heading', { name: 'Dialog', exact: true })).toBeVisible()
  await page.locator('#link-tabs').click()
  await expect(page.getByRole('heading', { name: 'Tabs', exact: true })).toBeVisible()
  await page.locator('#link-dialog').click()
  await expect(page.getByRole('heading', { name: 'Dialog', exact: true })).toBeVisible()
  expect(counts).toEqual({ dialog: 1, tabs: 1 })
  await expect(page.getByRole('heading', { name: 'Tabs', exact: true })).toHaveCount(0)
  await expect(page.locator('#loading-dialog')).toHaveCount(0)
  await expect(page.locator('#loading-tabs')).toHaveCount(0)
})


