import { expect, test } from '@playwright/test'

test('runtime build ID matches version.json in every browser engine', async ({ page, request }) => {
  const response = await request.get('/version.json')
  expect(response.ok()).toBe(true)
  const version = await response.json() as { buildId: string }
  await page.goto('/')
  await expect(page.locator('#build-id')).toHaveText(version.buildId)
})
