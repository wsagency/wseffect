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
