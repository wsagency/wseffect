import { expect, test } from '@playwright/test'
import { accessibilityViolations } from './helpers/accessibility.ts'

const routes = [
  '/', '/layout', '/typography', '/buttons', '/cards', '/text-field', '/dialog',
  '/dropdown-menu', '/tabs', '/theme', '/shared', '/shared-a', '/virtual-list', '/data-table',
  '/form', '/menus', '/accessibility', '/layout-extra', '/avatar', '/feedback',
  '/typography-extra', '/icon-button', '/links', '/scroll-area', '/data', '/theme-panel',
  '/alert-dialog', '/popover', '/hover-card', '/tooltip', '/context-menu', '/tab-nav',
]

test('every gallery route has no accessibility violations', async ({ page }) => {
  for (const route of routes) {
    await page.goto(route)
    await page.waitForLoadState('networkidle')
    expect(await accessibilityViolations(page), `${route} accessibility violations`).toEqual([])
  }
})
