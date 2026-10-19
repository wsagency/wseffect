import { expect, test } from '@playwright/test'

const pageChunks = /\/assets\/(?:buttons|cards|dialog|dropdownMenu|form|layout|menus|sharedA|sharedB|tabs|textField|theme|typography|virtualList)-[^/]+\.js(?:\?.*)?$/i

test('the gallery root does not request any lazy page chunk', async ({ page }) => {
  const chunks: string[] = []
  page.on('request', (request) => {
    if (pageChunks.test(new URL(request.url()).pathname)) chunks.push(request.url())
  })
  await page.goto('/')
  await expect(page.locator('#date-shell')).toBeVisible()
  expect(chunks).toEqual([])
})
