import { expect, test } from '@playwright/test'
import { startChildListRecorder, stopChildListRecorder } from './helpers/mutations.ts'

function attributes(element: Element): Record<string, string> {
  const result: Record<string, string> = {}
  for (const attribute of Array.from(element.attributes)) result[attribute.name] = attribute.value
  return result
}

test('root accent change updates only accent and auto-derived gray attributes', async ({ page }) => {
  await page.goto('/theme')
  const rootTheme = page.locator('[data-is-root-theme="true"]')
  const before = await rootTheme.evaluate(attributes)
  await page.getByRole('button', { name: 'Accent color' }).click()
  await expect(rootTheme).toHaveAttribute('data-accent-color', 'crimson')
  const after = await rootTheme.evaluate(attributes)
  const changed = new Set([...Object.keys(before), ...Object.keys(after)].filter((key) => before[key] !== after[key]))
  expect([...changed].sort()).toEqual(['data-accent-color', 'data-gray-color'])
  expect(after['data-gray-color']).not.toBe('auto')
})

test('changing accent while a dialog is open keeps it open and focused', async ({ page }) => {
  await page.goto('/theme')
  const rootTheme = page.locator('[data-is-root-theme="true"]')
  const dialogTrigger = page.locator('#theme-dialog-open')
  await dialogTrigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const before = await rootTheme.evaluate(attributes)
  await startChildListRecorder(page, '[role="dialog"]')
  const accentSelect = page.locator('#theme-dialog-accent')
  await accentSelect.selectOption('crimson')
  await expect(rootTheme).toHaveAttribute('data-accent-color', 'crimson')
  await expect(dialog).toBeVisible()
  await expect(accentSelect).toBeFocused()
  const after = await rootTheme.evaluate(attributes)
  const changed = new Set([...Object.keys(before), ...Object.keys(after)].filter((key) => before[key] !== after[key]))
  expect([...changed].sort()).toEqual(['data-accent-color', 'data-gray-color'])
  expect(await stopChildListRecorder(page)).toBe(0)
})


