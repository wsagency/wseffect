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
