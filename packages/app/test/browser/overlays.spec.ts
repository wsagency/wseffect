import { expect, test } from '@playwright/test'
import { createServer, type ViteDevServer } from 'vite'
import { resolve } from 'node:path'
import type { Page } from '@playwright/test'

let server: ViteDevServer
let baseUrl: string

test.beforeAll(async () => {
  const root = resolve(import.meta.dirname, '../..')
  server = await createServer({ root, configFile: false, server: { host: '127.0.0.1', port: 0 }, appType: 'spa' })
  await server.listen()
  const address = server.httpServer!.address()
  if (address === null || typeof address === 'string') throw new Error('Vite did not bind a TCP port')
  baseUrl = `http://127.0.0.1:${address.port}`
})

test.afterAll(async () => { await server?.close() })

async function assertPortalTokens(page: Page, name: string, selector: string): Promise<void> {
  const content = page.locator(selector)
  await expect(content, `${name} content is visible`).toBeVisible()
  const values = await content.evaluate(element => {
    const portalRoot = document.querySelector('#foldkit-portal-root')
    const contentStyle = getComputedStyle(element)
    const themeStyle = getComputedStyle(document.querySelector('.radix-themes[data-is-root-theme="true"]')!)
    return {
      contained: portalRoot?.contains(element) ?? false,
      accent: contentStyle.getPropertyValue('--accent-9').trim(),
      themeAccent: themeStyle.getPropertyValue('--accent-9').trim(),
      radius: contentStyle.getPropertyValue('--radius-3').trim(),
      themeRadius: themeStyle.getPropertyValue('--radius-3').trim(),
    }
  })
  expect(values.accent, `${name} computed --accent-9 is non-empty`).not.toBe('')
  expect(values.themeAccent, `${name} themed root --accent-9 is non-empty`).not.toBe('')
  expect(values.accent, `${name} inherits --accent-9`).toBe(values.themeAccent)
  expect(values.radius, `${name} computed --radius-3 is non-empty`).not.toBe('')
  expect(values.themeRadius, `${name} themed root --radius-3 is non-empty`).not.toBe('')
  expect(values.radius, `${name} inherits --radius-3`).toBe(values.themeRadius)
}

test('all overlay portal contents stay contained and inherit root Theme tokens', async ({ page }) => {
  await page.goto(`${baseUrl}/test/browser/overlays.html`)
  const theme = page.locator('.radix-themes[data-is-root-theme="true"]')
  await expect(theme).toBeVisible()
  await expect(theme.locator('#foldkit-portal-root')).toHaveCount(1)

  await page.getByRole('button', { name: 'Popover', exact: true }).click()
  await assertPortalTokens(page, 'Popover', '.rt-PopoverContent')
  await page.keyboard.press('Escape')
  await expect(page.locator('.rt-PopoverContent')).toHaveCount(0)

  await page.getByRole('button', { name: 'Hover for tooltip' }).hover()
  await assertPortalTokens(page, 'Tooltip', '.rt-TooltipContent')
  await page.mouse.move(0, 0)
  await page.getByRole('button', { name: 'Open alert dialog' }).click()
  await expect(page.locator('dialog[open][role="alertdialog"]')).toBeVisible()
  await expect(page.locator('.rt-DialogContent')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog[open][role="alertdialog"]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Hover for card' }).hover()
  await assertPortalTokens(page, 'HoverCard', '#overlay-hover-card-panel')
  await page.mouse.move(0, 0)

  await page.locator('#overlay-context-menu-source').click({ button: 'right' })
  await assertPortalTokens(page, 'ContextMenu', '[role="menu"].rt-ContextMenuContent')
})
