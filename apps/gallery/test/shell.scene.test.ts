import * as Scene from 'foldkit/scene'
import { Context } from 'effect'
import { describe, expect, it, vi } from 'vitest'
import { Message as MenusPageMessage, page as menusPage, Menu } from '../src/pages/menus.js'
import { BUILD_ID } from '@wsagency/wseffect-app'
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

  it('memoizes ready page views across unrelated shell updates with stable dispatch', async () => {
    pages.registry.register('menus', menusPage)
    const htmlRuntime = await import(new URL('./index.js', import.meta.resolve('foldkit/html')).href) as unknown as {
      __beginRender: (registry: object) => void
      __clearRuntime: () => void
      __createBoundaryRegistry: () => object
      __htmlBuilder: <Message>() => Parameters<typeof view>[1]
      __requireDispatch: () => (message: unknown) => void
      __setRuntime: (dispatch: (message: unknown) => void, context: Context.Context<never>, registry: object) => void
    }
    const boundaryRegistry = htmlRuntime.__createBoundaryRegistry()
    const dispatch = (_message: unknown) => {}
    const runtimeContext = Context.empty()
    const render = (model: Parameters<typeof view>[0]) => {
      htmlRuntime.__beginRender(boundaryRegistry)
      htmlRuntime.__setRuntime(dispatch, runtimeContext, boundaryRegistry)
      try {
        return view(model, htmlRuntime.__htmlBuilder<Message>())
      } finally {
        htmlRuntime.__clearRuntime()
      }
    }
    const pageDispatches: Array<ReturnType<typeof htmlRuntime.__requireDispatch>> = []
    const originalPageView = menusPage.view
    const pageViewSpy = vi.spyOn(menusPage, 'view').mockImplementation((...args) => {
      pageDispatches.push(htmlRuntime.__requireDispatch())
      return originalPageView(...args)
    })
    const embedSpy = vi.spyOn(Menu, 'embed')
    try {
      let model = createInitialModel()
      render(model)
      model = update(model, Message.ChangedUrl({ path: '/menus' })).model
      render(model)
      expect(pageViewSpy).not.toHaveBeenCalled()

      model = update(model, Message.GotKitMessage({ message: KitMessage.LoadedPageModule({ key: 'menus' }) })).model
      const menuDocument = render(model)
      expect(pageViewSpy).toHaveBeenCalledTimes(1)
      expect(embedSpy).toHaveBeenCalledTimes(200)
      expect(Scene.findAll(menuDocument.body!, '[data-menu-index]')).toHaveLength(200)
      expect(Scene.findAll(menuDocument.body!, '.radix-themes #foldkit-portal-root')).toHaveLength(1)
      const initialPageDispatch = pageDispatches[0]
      model = update(model, Message.GotKitMessage({
        message: KitMessage.CompletedPrefetch({ key: 'menus', isLoaded: true }),
      })).model
      render(model)
      expect(pageViewSpy).toHaveBeenCalledTimes(1)


      model = update(model, Message.GotKitMessage({ message: KitMessage.NewVersionAvailable({ buildId: 'next' }) })).model
      render(model)
      expect(pageViewSpy).toHaveBeenCalledTimes(1)
      expect(embedSpy).toHaveBeenCalledTimes(200)

      model = update(model, Message.GotKitMessage({
        message: KitMessage.GotMenusPageMessage({ message: MenusPageMessage.Tick() }),
      })).model
      render(model)
      expect(pageViewSpy).toHaveBeenCalledTimes(2)
      expect(pageDispatches[1]).toBe(initialPageDispatch)
    } finally {
      pageViewSpy.mockRestore()
      embedSpy.mockRestore()
    }
})
})
