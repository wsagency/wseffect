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
  test(`Select ${position} item indicator has the pinned item-relative geometry`, async ({ page }) => {
    await page.goto(`${baseUrl}/packages/app/test/browser/select.html?position=${position}`)
    const trigger = page.locator('button.rt-SelectTrigger')
    await trigger.focus()
    await page.keyboard.press('ArrowDown')
    const item = page.getByRole('option', { name: 'Red' })
    const indicator = item.locator('.rt-SelectItemIndicator')
    const geometry = await item.evaluate(element => {
      const row = element.getBoundingClientRect()
      const icon = element.querySelector('.rt-SelectItemIndicator')!.getBoundingClientRect()
      const wrapper = element.querySelector('.rt-SelectItemContent')!
      return { left: icon.left - row.left, top: icon.top - row.top, display: getComputedStyle(wrapper).display, rowHeight: row.height, iconHeight: icon.height }
    })
    expect(geometry).toEqual({ left: 0, top: 11, display: 'contents', rowHeight: 32, iconHeight: 10 })
    await expect(indicator).toBeVisible()
  })

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
test('item-aligned selection stays aligned with the trigger when the panel is clamped', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  for (const geometry of ['top', 'bottom'] as const) {
    await page.goto(`${baseUrl}/packages/app/test/browser/select.html?geometry=${geometry}`)
    const trigger = page.locator('button.rt-SelectTrigger')
    await trigger.focus()
    await page.keyboard.press('ArrowDown')
    const selected = page.getByRole('option', { name: 'Item 35', exact: true })
    await expect(selected).toBeVisible()
    const alignment = await page.evaluate(() => {
      const triggerRect = document.querySelector('button.rt-SelectTrigger')!.getBoundingClientRect()
      const listbox = document.querySelector('[role="listbox"]') as HTMLElement
      const item = document.querySelector('[role="option"][data-selected]')!
      const itemRect = item.getBoundingClientRect()
      return {
        triggerTop: triggerRect.top,
        itemTop: itemRect.top,
        scrollTop: listbox.scrollTop,
        scrollHeight: listbox.scrollHeight,
        clientHeight: listbox.clientHeight,
        panelTop: listbox.getBoundingClientRect().top,
      }
    })
    expect(Math.abs(alignment.itemTop - alignment.triggerTop), `${geometry}: ${JSON.stringify(alignment)}`).toBeLessThanOrEqual(1)
  }
})
test('item-aligned selection remains fully visible at viewport edges with short and long lists', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  for (const edge of ['top-short', 'top-long', 'bottom-short', 'bottom-long'] as const) {
    await page.goto(`${baseUrl}/packages/app/test/browser/select.html?edge=${edge}`)
    const trigger = page.locator('button.rt-SelectTrigger')
    await page.addStyleTag({
      content: `button#choice-button { position: fixed !important; top: ${edge.startsWith('top-') ? '0px' : 'auto'} !important; bottom: ${edge.startsWith('bottom-') ? '0px' : 'auto'} !important; } [role="listbox"] { padding: 0 !important; }`,
    })
    await trigger.focus()
    await page.keyboard.press('ArrowDown')
    const selected = page.getByRole('option', {
      name: edge.endsWith('-short') ? 'Item 1' : 'Item 35',
      exact: true,
    })
    await expect(selected).toBeVisible()
    await expect(page.getByRole('option')).toHaveCount(edge.endsWith('-short') ? 2 : 50)
    const geometry = await page.evaluate(() => {
      const triggerRect = document.querySelector('button.rt-SelectTrigger')!.getBoundingClientRect()
      const panel = document.querySelector('[role="listbox"]') as HTMLElement
      const item = document.querySelector('[role="option"][data-selected]')!
      const panelRect = panel.getBoundingClientRect()
      const itemRect = item.getBoundingClientRect()
      return {
        triggerTop: triggerRect.top,
        triggerBottom: triggerRect.bottom,
        panelTop: panelRect.top,
        panelBottom: panelRect.bottom,
        panelHeight: panelRect.height,
        scrollHeight: panel.scrollHeight,
        itemTop: itemRect.top,
        itemBottom: itemRect.bottom,
        itemHeight: itemRect.height,
        viewportHeight: window.innerHeight,
      }
    })
    if (edge.startsWith('top-')) expect(geometry.triggerTop).toBe(0)
    else expect(geometry.triggerBottom).toBe(800)
    expect(geometry.panelHeight).toBeGreaterThanOrEqual(geometry.itemHeight)
    expect(geometry.itemHeight).toBe(32)
    expect(geometry.itemTop).toBeGreaterThanOrEqual(geometry.panelTop)
    expect(geometry.itemBottom).toBeLessThanOrEqual(geometry.panelBottom)
    expect(geometry.itemTop).toBeGreaterThanOrEqual(8)
    expect(geometry.itemBottom).toBeLessThanOrEqual(geometry.viewportHeight - 8)
  }
})

test('Select popper hides its scrollbar when the options fit', async ({ page }) => {
  await page.goto(`${baseUrl}/packages/app/test/browser/select.html?position=popper`)
  await page.locator('button.rt-SelectTrigger').focus()
  await page.keyboard.press('ArrowDown')
  const scrollbar = page.locator('.rt-SelectContent .rt-ScrollAreaScrollbar[data-orientation="vertical"]')
  await expect(scrollbar).toHaveAttribute('data-state', 'hidden')
  await expect(scrollbar).toBeHidden()
})
