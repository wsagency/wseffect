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
}

export type GalleryRoute = keyof typeof pageKeysByRoute
export type GalleryPageKey = typeof pageKeysByRoute[GalleryRoute][number]

export function pageKeysForRoute(route: string): ReadonlyArray<GalleryPageKey> {
  return pageKeysByRoute[route as GalleryRoute] ?? []
}
