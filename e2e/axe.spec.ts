import { expect, test } from '@playwright/test'
import { accessibilityViolations } from './helpers/accessibility.ts'

const routes = [
  '/', '/layout', '/typography', '/buttons', '/cards', '/text-field', '/dialog',
  '/dropdown-menu', '/tabs', '/theme', '/shared', '/shared-a', '/virtual-list',
  '/form', '/menus', '/components',
]

test('gallery routes render without load errors and have no accessibility violations', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/components')
  await expect(page.locator('#component-families')).toBeVisible()
  const familyRoutes = await page.locator('#component-families a').evaluateAll((links) =>
    links.map((link) => new URL((link as HTMLAnchorElement).href).pathname))
  for (const route of new Set([...routes, ...familyRoutes])) {
    await page.goto(route)
    await page.waitForLoadState('networkidle')
    if (familyRoutes.includes(route)) {
      await expect(page.locator('[role="alert"]')).toHaveCount(0)
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    }
    expect(await accessibilityViolations(page), `${route} accessibility violations`).toEqual([])
  }
})
