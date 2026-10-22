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
    ['/virtual-list', ['virtualList']],
    ['/data-table', ['dataTable']],
    ['/menus', ['menus']],
    ['/alert-dialog', ['alertDialog']],
    ['/context-menu', ['contextMenu']],
    ['/hover-card', ['hoverCard']],
    ['/popover', ['popover']],
    ['/tab-nav', ['tabNav']],
    ['/tooltip', ['tooltip']],
    ['/accessibility', ['accessibility']],
    ['/layout-extra', ['layoutExtra']],
    ['/avatar', ['avatar']],
    ['/feedback', ['feedback']],
    ['/typography-extra', ['typographyExtra']],
    ['/icon-button', ['iconButton']],
    ['/links', ['links']],
    ['/scroll-area', ['scrollArea']],
    ['/data', ['data']],
    ['/theme-panel', ['themePanel']],
  ] as const)('maps %s to its lazy pages', (route, keys) => {
    expect(pageKeysForRoute(route)).toEqual(keys)
  })

  it('keeps the new component families off primary pages', () => {
    const newRoutes = [
      '/accessibility', '/layout-extra', '/avatar', '/feedback', '/typography-extra',
      '/icon-button', '/links', '/scroll-area', '/data', '/theme-panel',
      '/alert-dialog', '/popover', '/hover-card', '/tooltip', '/context-menu', '/tab-nav',
    ]
    for (const route of newRoutes) {
      for (const key of pageKeysForRoute(route)) {
        expect(primaryPages).not.toContain(key)
      }
    }
  })
})
