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

test('every gallery route has no accessibility violations', async ({ page }) => {
  for (const route of routes) {
    await page.goto(route)
    await page.waitForLoadState('networkidle')
    expect(await accessibilityViolations(page), `${route} accessibility violations`).toEqual([])
  }
})
