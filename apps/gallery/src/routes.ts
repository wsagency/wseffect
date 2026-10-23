export const pageKeysByRoute = {
  '/': [],
  '/layout': ['layout'],
  '/typography': ['typography'],
  '/buttons': ['buttons'],
  '/cards': ['cards'],
  '/text-field': ['textField'],
  '/dialog': ['dialog'],
  '/dropdown-menu': ['dropdownMenu'],
  '/tabs': ['tabs'],
  '/theme': ['theme'],
  '/shared': ['sharedA', 'sharedB'],
  '/shared-a': ['sharedA'],
  '/virtual-list': ['virtualList'],
  '/form': ['form'],
  '/menus': ['menus'],
  '/components': ['components'],
  '/components/accessibility': ['accessibility'],
  '/components/alert-dialog': ['alertDialog'],
  '/components/avatar': ['avatar'],
  '/components/context-menu': ['contextMenu'],
  '/components/data': ['data'],
  '/components/data-table': ['dataTable'],
  '/components/feedback': ['feedback'],
  '/components/forms-extra': ['formsExtra'],
  '/components/hover-card': ['hoverCard'],
  '/components/icon-button': ['iconButton'],
  '/components/layout-extra': ['layoutExtra'],
  '/components/links': ['links'],
  '/components/popover': ['popover'],
  '/components/range-slider': ['rangeSlider'],
  '/components/scroll-area': ['scrollArea'],
  '/components/select': ['select'],
  '/components/tab-nav': ['tabNav'],
  '/components/theme-panel': ['themePanel'],
  '/components/tooltip': ['tooltip'],
  '/components/typography-extra': ['typographyExtra'],
  '/capabilities': ['capabilities'],
  '/capabilities/signals': ['signals'],
  '/capabilities/validation': ['validation'],
  '/capabilities/persistence': ['persistence'],
  '/capabilities/browser': ['browser'],
  '/capabilities/island': ['island'],
} as const

export type GalleryRoute = keyof typeof pageKeysByRoute
export type GalleryPageKey = typeof pageKeysByRoute[GalleryRoute][number]

export function pageKeysForRoute(route: string): ReadonlyArray<GalleryPageKey> {
  const normalizedRoute = route.length > 1 ? route.replace(/\/+$/, '') : route
  return pageKeysByRoute[normalizedRoute as GalleryRoute] ?? []
}
