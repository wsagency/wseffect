import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
test.use({ serviceWorkers: 'block' })

const chunk = (key: string): RegExp => new RegExp(`/assets/${key}-[^/]+\\.js(?:\\?.*)?$`, 'i')

function observeChunk(page: Page, key: string): { readonly response: Promise<unknown>; readonly count: () => number } {
  let requests = 0
  page.on('request', (request) => {
    if (chunk(key).test(new URL(request.url()).pathname)) requests++
  })
  const response = page.waitForResponse(
    (item) => chunk(key).test(new URL(item.url()).pathname),
    { timeout: 5_000 },
  )
  return { response, count: () => requests }
}

test('a failed primary page load exposes LoadError and retry renders the page', async ({ page }) => {
  await page.route(chunk('buttons'), (route) => route.abort())
  await page.goto('/buttons')
  await expect(page.locator('#failed-buttons[data-cause="LoadError"]')).toBeVisible()
  await page.unroute(chunk('buttons'))
  await page.locator('#retry-buttons').click()
  await expect(page.getByRole('heading', { name: 'Buttons', exact: true })).toBeVisible()
})

test('hover prefetch and navigation of a prefetched link request a page chunk once without loading UI', async ({ page }) => {
  const buttons = observeChunk(page, 'buttons')
  await page.goto('/')
  await page.locator('#link-buttons').hover()
  await buttons.response
  await expect(page.locator('#loading-buttons')).toHaveCount(0)
  await page.evaluate(() => {
    const target = document.body
    const windowWithObserver = window as Window & { __loadingInsertions?: string[]; __loadingObserver?: MutationObserver }
    windowWithObserver.__loadingInsertions = []
    windowWithObserver.__loadingObserver = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element && node.id.startsWith('loading-')) windowWithObserver.__loadingInsertions!.push(node.id)
          if (node instanceof Element) windowWithObserver.__loadingInsertions!.push(...Array.from(node.querySelectorAll('[id^="loading-"]'), (item) => item.id))
        }
      }
    })
    windowWithObserver.__loadingObserver.observe(target, { childList: true, subtree: true })
  })
  await page.locator('#link-buttons').click()
  await expect(page.getByRole('heading', { name: 'Buttons', exact: true })).toBeVisible()
  expect(await page.evaluate(() => {
    const windowWithObserver = window as Window & { __loadingInsertions?: string[]; __loadingObserver?: MutationObserver }
    windowWithObserver.__loadingObserver?.disconnect()
    return windowWithObserver.__loadingInsertions
  })).toEqual([])
  await expect(page.locator('#loading-buttons')).toHaveCount(0)
  expect(buttons.count()).toBe(1)

  const cards = observeChunk(page, 'cards')
  await page.goto('/')
  await page.locator('#link-cards').scrollIntoViewIfNeeded()
  await cards.response
  await expect(page.locator('#loading-cards')).toHaveCount(0)
  await page.locator('#link-cards').click()
  await expect(page.getByRole('heading', { name: 'Cards', exact: true })).toBeVisible()
  await expect(page.locator('#loading-cards')).toHaveCount(0)
  expect(cards.count()).toBe(1)
})

test('navigation renders the page when its earlier prefetch failed', async ({ page }) => {
  await page.route(chunk('buttons'), (route) => route.abort())
  const failedRequest = page.waitForEvent('requestfailed', (request) => chunk('buttons').test(new URL(request.url()).pathname))
  await page.goto('/')
  await page.locator('#link-buttons').hover()
  await failedRequest
  await page.unroute(chunk('buttons'))
  await page.locator('#link-buttons').click()
  await expect(page.getByRole('heading', { name: 'Buttons', exact: true })).toBeVisible()
})
