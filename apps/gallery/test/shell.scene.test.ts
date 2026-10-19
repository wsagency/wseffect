import { BUILD_ID } from '@wsagency/wseffect-app'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import { KitMessage, kit, pages } from '../src/pages.gen.js'
import { pageKeysByRoute } from '../src/routes.js'
import { Message, createInitialModel, update, view } from '../src/shell.js'

const visiblePageKeys = [...new Set(Object.entries(pageKeysByRoute)
  .flatMap(([path, keys]) => path === '/' ? [] : keys))]
const prefetchMountResolvers = visiblePageKeys.map((key) => [
  { name: 'PrefetchOnVisible', args: { key } },
  Message.GotKitMessage({ message: kit.messages.requestedPrefetch(key) }),
] as const)
const prefetchCommandResolvers = pages.keys.map((key) => [
  kit.commands.LoadPageForPrefetch({ key }),
  KitMessage.CompletedPrefetch({ key, isLoaded: true }),
] as const)

describe('gallery shell', () => {
  it('renders the build ID and performance hooks in the shell', () => {
    Scene.scene({ update, view }, Scene.given(createInitialModel()),
      Scene.Mount.resolveAll(...prefetchMountResolvers),
      Scene.Command.resolveAll(...prefetchCommandResolvers),
      Scene.expect(Scene.selector('[data-perf="shared-date"]')).toExist(),
      Scene.expect(Scene.selector('[data-perf="nav-cold"]')).toHaveAttr('href', '/menus'),
      Scene.expect(Scene.selector('[data-perf="nav-prefetch"]')).toHaveAttr('href', '/dialog'),
      Scene.expect(Scene.selector('#build-id')).toHaveText(BUILD_ID))
  })
})
