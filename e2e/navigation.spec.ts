import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const chunkPath = (key: string): RegExp => new RegExp(`/assets/${key}-[^/]+\\.js(?:\\?.*)?$`, 'i')
const countRequests = (page: Page, key: string, counts: Record<string, number>): void => {
  page.on('request', (request) => {
    if (chunkPath(key).test(new URL(request.url()).pathname)) counts[key] = (counts[key] ?? 0) + 1
  })
}

const waitForDelay = async (milliseconds: number): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, milliseconds)
  await promise
}

test('deep links load only the pages for their route', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname
    if (/\/assets\/(?:sharedA|sharedB|dialog)-[^/]+\.js$/i.test(pathname)) requests.push(pathname)
  })
  await page.goto('/shared')
  await expect(page.locator('#date-page-sharedA')).toBeVisible()
  await expect(page.locator('#date-page-sharedB')).toBeVisible()
  expect(requests.some((path) => /sharedA-/i.test(path))).toBe(true)
  expect(requests.some((path) => /sharedB-/i.test(path))).toBe(true)
  expect(requests.some((path) => /dialog-/i.test(path))).toBe(false)

  requests.length = 0
  await page.goto('/dialog')
  await expect(page.getByRole('heading', { name: 'Dialog', exact: true })).toBeVisible()
  expect(requests.some((path) => /dialog-/i.test(path))).toBe(true)
  expect(requests.some((path) => /shared[AB]-/i.test(path))).toBe(false)
})

test('back and forward retain shared page state and fetch each chunk once', async ({ page }) => {
  const counts: Record<string, number> = {}
  for (const key of ['sharedA', 'sharedB', 'dialog']) countRequests(page, key, counts)
  await page.goto('/shared')
  await expect(page.locator('#sharedA-note')).toHaveText('(none)')
  await page.locator('#sharedA-add-note').click()
  await expect(page.locator('#sharedA-note')).toHaveText('A shared note')
  await page.getByRole('link', { name: 'dialog', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Dialog', exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.locator('#sharedA-note')).toHaveText('A shared note')
  await page.goForward()
  await expect(page.getByRole('heading', { name: 'Dialog', exact: true })).toBeVisible()
  expect(counts).toEqual({ sharedA: 1, sharedB: 1, dialog: 1 })
})

test('delayed dialog-tabs-dialog navigation fetches each page once and ends on dialog', async ({ page }) => {
  const counts: Record<string, number> = {}
  for (const key of ['dialog', 'tabs']) countRequests(page, key, counts)
  for (const key of ['dialog', 'tabs']) {
    await page.route(chunkPath(key), async (route) => {
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

