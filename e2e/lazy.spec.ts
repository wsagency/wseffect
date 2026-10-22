import { expect, test } from '@playwright/test'
import { galleryPageAssets } from './helpers/build.ts'

test('the gallery root does not request any lazy page chunk', async ({ page }) => {
  const assets = await galleryPageAssets([
    'buttons', 'cards', 'dialog', 'dropdownMenu', 'form', 'layout', 'menus',
    'sharedA', 'sharedB', 'tabs', 'textField', 'theme', 'typography', 'virtualList',
  ])
  const chunks: string[] = []
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname
    if (Object.values(assets).includes(pathname)) chunks.push(request.url())
  })
  await page.setViewportSize({ width: 320, height: 100 })
  await page.goto('/')
  await expect(page.locator('#date-shell')).toBeVisible()
  await page.waitForTimeout(350)
  expect(chunks).toEqual([])
})
test('data-table styles are not part of the eager shell stylesheet', async ({ page }) => {
  const hasDataTableStyle = () => page.evaluate(() =>
    [...document.styleSheets].some((sheet) => {
      try {
        return [...sheet.cssRules].some((rule) =>
          rule instanceof CSSStyleRule && rule.selectorText.includes('.wse-data-table'),
        )
      } catch {
        return false
      }
    }),
  )

  await page.goto('/')
  await expect(page.locator('#date-shell')).toBeVisible()
  expect(await hasDataTableStyle()).toBe(false)

  await page.goto('/components/data-table')
  await expect(page.locator('.wse-data-table')).toBeVisible()
  expect(await hasDataTableStyle()).toBe(true)
})
