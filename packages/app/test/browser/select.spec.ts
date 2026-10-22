import { expect, test } from '@playwright/test'
import { createServer, type ViteDevServer } from 'vite'
import { fileURLToPath } from 'node:url'

let server: ViteDevServer
let baseUrl: string

test.beforeAll(async () => {
  const root = fileURLToPath(new URL('../../../..', import.meta.url))
  const port = 5250 + (process.pid % 50)
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

for (const position of ['item-aligned', 'popper'] as const) {
  test(`Select ${position} opens, navigates, selects, and restores trigger focus`, async ({ page }) => {
    await page.goto(`${baseUrl}/packages/app/test/browser/select.html?position=${position}`)
    const trigger = page.locator('button.rt-SelectTrigger')
    await trigger.focus()
    await page.keyboard.press('ArrowDown')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(trigger).toHaveAttribute('aria-controls', 'choice-items')
    const listbox = page.getByRole('listbox')
    if (position === 'item-aligned') await expect(listbox).toBeFocused()
    await expect(listbox).toBeVisible()
    await page.keyboard.press('ArrowDown')
    const blueOption = page.getByRole('option', { name: 'Blue' })
    if (position === 'item-aligned') await expect(blueOption).toHaveAttribute('data-active', 'true')
    else await expect(blueOption).toHaveAttribute('data-active')
    await page.keyboard.press('Enter')
    await expect(listbox).toBeHidden()
    await expect(trigger).toBeFocused()
    await expect.poll(() => page.evaluate(() => (window as Window & { __selected?: string }).__selected)).toBe('blue')
  })

  test(`Select ${position} renders labelled groups, sibling separators, and accumulated typeahead`, async ({ page }) => {
    await page.goto(`${baseUrl}/packages/app/test/browser/select.html?position=${position}`)
    const trigger = page.locator('button.rt-SelectTrigger')
    await trigger.focus()
    await page.keyboard.press('ArrowDown')
    const listbox = page.getByRole('listbox')
    await expect(listbox).toBeVisible()
    await expect(trigger).toHaveClass(/rt-r-size-3/)
    await expect(trigger).toHaveClass(/rt-variant-classic/)
    await expect(trigger).not.toHaveClass(/rt-high-contrast/)
    await expect(trigger).toHaveAttribute('data-accent-color', 'blue')
    await expect(trigger).toHaveAttribute('data-radius', 'large')
    await expect(page.locator('.rt-SelectTriggerInner')).toBeVisible()
    await expect(page.locator('.rt-SelectIcon')).toBeVisible()
    await expect(listbox).toHaveClass(/rt-SelectContent/)
    await expect(listbox).toHaveClass(/rt-high-contrast/)
    await expect(listbox).toHaveAttribute('data-accent-color', 'blue')
    await expect(listbox).toHaveAttribute('data-radius', 'large')
    await expect(page.getByRole('group', { name: 'Warm Colors' }).first()).toBeVisible()
    const separators = page.getByRole('separator')
    await expect(separators).toHaveCount(2)
    for (const separator of await separators.all()) {
      expect(await separator.evaluate(element => element.parentElement?.getAttribute('role'))).not.toBe('option')
    }
    await expect(page.getByRole('option', { name: 'Disabled green' })).toHaveAttribute('aria-disabled', 'true')
    await page.keyboard.type('bl')
    await expect(page.getByRole('option', { name: 'Blue' })).toHaveAttribute('data-active')
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('option', { name: 'Yellow' })).toHaveAttribute('data-active')
  })
}
