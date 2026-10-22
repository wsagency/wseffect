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
  '/data-table': ['dataTable'],
  '/form': ['form'],
  '/menus': ['menus'],
  '/accessibility': ['accessibility'],
  '/alert-dialog': ['alertDialog'],
  '/avatar': ['avatar'],
  '/context-menu': ['contextMenu'],
  '/data': ['data'],
  '/feedback': ['feedback'],
  '/hover-card': ['hoverCard'],
  '/icon-button': ['iconButton'],
  '/layout-extra': ['layoutExtra'],
  '/links': ['links'],
  '/popover': ['popover'],
  '/scroll-area': ['scrollArea'],
  '/tab-nav': ['tabNav'],
  '/theme-panel': ['themePanel'],
  '/tooltip': ['tooltip'],
  '/typography-extra': ['typographyExtra'],

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
  return pageKeysByRoute[route as GalleryRoute] ?? []
}
