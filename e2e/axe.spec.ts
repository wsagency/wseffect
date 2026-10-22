import { expect, test } from '@playwright/test'
import { accessibilityViolations } from './helpers/accessibility.ts'

const routes = [
  '/', '/layout', '/typography', '/buttons', '/cards', '/text-field', '/dialog',
  '/dropdown-menu', '/tabs', '/theme', '/shared', '/shared-a', '/virtual-list',
  '/form', '/menus', '/components', '/components/accessibility', '/components/layout-extra',
  '/components/avatar', '/components/feedback', '/components/typography-extra', '/components/icon-button',
  '/components/links', '/components/scroll-area', '/components/data', '/components/forms-extra',
  '/components/select', '/components/range-slider', '/components/tab-nav', '/components/alert-dialog',
  '/components/popover', '/components/hover-card', '/components/tooltip', '/components/context-menu',
  '/components/theme-panel', '/components/data-table',
]

test('gallery routes render without load errors and have no accessibility violations', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/components')
  await expect(page.locator('.gallery-components-nav')).toBeVisible()
  const familyRoutes = await page.locator('.gallery-components-nav a').evaluateAll((links) =>
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
