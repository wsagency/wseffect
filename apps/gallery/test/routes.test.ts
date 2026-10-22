import { describe, expect, it } from 'vitest'
import { pageKeysForRoute } from '../src/routes.js'
import { primaryPages } from '../src/primaryPages.js'


describe('gallery route page keys', () => {
  it.each([
    ['/', []],
    ['/layout', ['layout']],
    ['/typography', ['typography']],
    ['/buttons', ['buttons']],
    ['/cards', ['cards']],
    ['/text-field', ['textField']],
    ['/dialog', ['dialog']],
    ['/dropdown-menu', ['dropdownMenu']],
    ['/tabs', ['tabs']],
    ['/theme', ['theme']],
    ['/shared', ['sharedA', 'sharedB']],
    ['/shared-a', ['sharedA']],
    ['/menus', ['menus']],
    ['/components', ['components']],
    ['/components/data-table', ['components']],
    ['/components/tooltip', ['components']],
    ['/components/', ['components']],
  ] as const)('maps %s to its lazy pages', (route, keys) => {
    expect(pageKeysForRoute(route)).toEqual(keys)
  })

  it('keeps the new component families off primary pages', () => {
    const newRoutes = [
      '/components/accessibility', '/components/layout-extra', '/components/avatar', '/components/feedback',
      '/components/typography-extra', '/components/icon-button', '/components/links', '/components/scroll-area',
      '/components/data', '/components/data-table', '/components/theme-panel', '/components/alert-dialog',
      '/components/popover', '/components/hover-card', '/components/tooltip', '/components/context-menu',
      '/components/tab-nav',
    ]
    for (const route of newRoutes) {
      for (const key of pageKeysForRoute(route)) {
        expect(primaryPages).not.toContain(key)
      }
    }
  })
})
