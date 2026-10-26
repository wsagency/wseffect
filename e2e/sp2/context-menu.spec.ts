import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const source = (page: Page) => page.locator('#gallery-context-source')
const menu = (page: Page) => page.getByRole('menu')

test('pointer and keyboard invocation support refined typeahead and restore focus on close', async ({ page }) => {
  await page.goto('/components/context-menu')
  const target = source(page)
  await target.click({ button: 'right' })
  await expect(menu(page)).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Open', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu(page)).toHaveCount(0)
  await expect(target).toBeFocused()

  await target.focus()
  await page.keyboard.press('Shift+F10')
  await expect(menu(page)).toBeVisible()
  await page.keyboard.press('r')
  await page.keyboard.press('e')
  await expect(page.getByRole('menuitem', { name: 'Rename', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu(page)).toHaveCount(0)
  await expect(target).toBeFocused()
})
test('keyboard invocation focuses the first item for immediate Enter; pointer invocation focuses it too', async ({ page }) => {
  await page.goto('/components/context-menu')
  const target = source(page)
  await target.focus()
  await page.keyboard.press('Shift+F10')
  const firstItem = page.getByRole('menuitem', { name: 'Open', exact: true })
  await expect(menu(page)).toBeVisible()
  await expect(firstItem).toBeFocused()
  await expect(firstItem).toHaveAttribute('data-active', '')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Selected: Open', { exact: true })).toBeVisible()
  await expect(menu(page)).toHaveCount(0)

  await target.click({ button: 'right' })
  await expect(menu(page)).toBeVisible()
  await expect(firstItem).toBeFocused()
  await expect(firstItem).toHaveAttribute('data-active', '')
})

test('does not restore focus to a replacement source reusing the original id', async ({ page }) => {
  await page.goto('/components/context-menu')
  const target = source(page)
  await target.click({ button: 'right' })
  await expect(menu(page)).toBeVisible()
  await page.evaluate(() => {
    const original = document.getElementById('gallery-context-source')!
    const replacement = document.createElement('button')
    replacement.id = original.id
    replacement.setAttribute('data-context-source-token', 'replacement-token')
    replacement.textContent = 'Replacement'
    original.replaceWith(replacement)
  })
  const impostor = page.locator('#gallery-context-source')
  await expect(impostor).not.toBeFocused()
  await page.getByRole('menuitem', { name: 'Open', exact: true }).click()
  await expect(menu(page)).toHaveCount(0)
  await expect(impostor).not.toBeFocused()
})

test('outside press closes a pointer-opened menu and restores focus to its source', async ({ page }) => {
  await page.goto('/components/context-menu')
  const target = source(page)
  await target.click({ button: 'right' })
  await expect(menu(page)).toBeVisible()
  await page.getByRole('heading', { name: 'Context menu' }).click()
  await expect(menu(page)).toHaveCount(0)
  await expect(target).toBeFocused()
})

test('navigating away while open removes the source without stale focus restoration', async ({ page }) => {
  await page.goto('/components/context-menu')
  await source(page).click({ button: 'right' })
  await expect(menu(page)).toBeVisible()
  await page.getByRole('navigation', { name: 'Gallery pages', exact: true })
    .getByRole('link', { name: 'theme', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Theme settings' })).toBeVisible()
  await expect(source(page)).toHaveCount(0)
  await expect(menu(page)).toHaveCount(0)
  expect(await page.evaluate(() => document.activeElement?.id)).not.toBe('gallery-context-source')
})

test('touch long press opens once and a cancelled press does not open', async ({ page }) => {
  await page.goto('/components/context-menu')
  const target = source(page)
  await target.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 1, isPrimary: true, clientX: 20, clientY: 20, button: 0 })
  await target.dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 1, isPrimary: true, clientX: 20, clientY: 20, button: 0 })
  await page.waitForTimeout(650)
  await expect(menu(page)).toHaveCount(0)
  await target.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 3, isPrimary: true, clientX: 20, clientY: 20, button: 0 })
  await target.dispatchEvent('pointermove', { pointerType: 'touch', pointerId: 3, isPrimary: true, clientX: 40, clientY: 20, button: 0 })
  await target.dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 3, isPrimary: true, clientX: 40, clientY: 20, button: 0 })
  await page.waitForTimeout(650)
  await expect(menu(page)).toHaveCount(0)

  await target.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 2, isPrimary: true, clientX: 20, clientY: 20, button: 0 })
  const beforeActivationPrevented = await target.evaluate(node => {
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, clientX: 20, clientY: 20 })
    node.dispatchEvent(event)
    return event.defaultPrevented
  })
  expect(beforeActivationPrevented).toBe(false)
  await expect(menu(page)).toHaveCount(0)
  await expect(menu(page)).toBeVisible({ timeout: 2_000 })
  const afterActivationPrevented = await target.evaluate(node => {
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, clientX: 20, clientY: 20 })
    node.dispatchEvent(event)
    return event.defaultPrevented
  })
  expect(afterActivationPrevented).toBe(true)
  await expect(menu(page)).toHaveCount(1)
  await target.dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 2, isPrimary: true, clientX: 20, clientY: 20, button: 0 })
  await page.keyboard.press('Escape')
  await expect(menu(page)).toHaveCount(0)
})
