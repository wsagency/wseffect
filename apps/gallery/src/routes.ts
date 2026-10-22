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
  if (normalizedRoute === '/components' || normalizedRoute.startsWith('/components/')) return ['components']
  return pageKeysByRoute[normalizedRoute as GalleryRoute] ?? []
}
