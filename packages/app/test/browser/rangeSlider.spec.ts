import { expect, test } from '@playwright/test'
import { createServer, type ViteDevServer } from 'vite'
import { fileURLToPath } from 'node:url'

type RangeSliderWindow = Window & { __thumbs?: ReadonlyArray<number> }

let server: ViteDevServer
let baseUrl: string

test.beforeAll(async () => {
  const root = fileURLToPath(new URL('../../../..', import.meta.url))
  const port = 5300 + (process.pid % 50)
  server = await createServer({
    root,
    configFile: false,
    appType: 'spa',
    server: { host: '127.0.0.1', port, strictPort: true, hmr: false },
  })
  await server.listen()
  baseUrl = `http://127.0.0.1:${port}`
})

test.afterAll(async () => {
  await server?.close()
})

test('pointer drags each thumb and track clicks move the nearest thumb', async ({ page }) => {
  await page.goto(`${baseUrl}/packages/app/test/browser/rangeSlider.html`)
  const slider = page.locator('#slider')
  const bounds = await slider.boundingBox()
  expect(bounds).not.toBeNull()
  const { x, y, width, height } = bounds!
  const centerY = y + height / 2
  const thumbs = () => page.evaluate(() => (window as RangeSliderWindow).__thumbs)

  await page.mouse.move(x + width * 0.25, centerY)
  await page.mouse.down()
  await page.mouse.move(x + width * 0.35, centerY)
  await page.mouse.up()
  await expect.poll(thumbs).toEqual([35, 75])

  await page.mouse.move(x + width * 0.75, centerY)
  await page.mouse.down()
  await page.mouse.move(x + width * 0.65, centerY)
  await page.mouse.up()
  await expect.poll(thumbs).toEqual([35, 65])

  await page.mouse.click(x + width * 0.55, centerY)
  await expect.poll(thumbs).toEqual([35, 55])
})
test('Escape cancels a pointer drag until pointerup across later moves', async ({ page }) => {
  await page.goto(`${baseUrl}/packages/app/test/browser/rangeSlider.html`)
  const slider = page.locator('#slider')
  const bounds = await slider.boundingBox()
  expect(bounds).not.toBeNull()
  const { x, y, width, height } = bounds!
  const centerY = y + height / 2
  const thumbs = () => page.evaluate(() => (window as RangeSliderWindow).__thumbs)

  await page.mouse.move(x + width * 0.25, centerY)
  await page.mouse.down()
  await page.mouse.move(x + width * 0.35, centerY)
  await expect.poll(thumbs).toEqual([35, 75])
  await page.keyboard.press('Escape')
  await expect.poll(thumbs).toEqual([25, 75])
  await page.mouse.move(x + width * 0.55, centerY)
  await page.mouse.up()

  await expect.poll(thumbs).toEqual([25, 75])
})
