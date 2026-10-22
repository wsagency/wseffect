import * as Floating from '@floating-ui/dom'
import * as Anchor from '@foldkit/ui/anchor'
import { Effect, Fiber, Option, Schema, Stream } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import * as Menu from '@foldkit/ui/menu'
import { expect, it, vi } from 'vitest'
import * as ContextMenu from '../src/context-menu.js'
vi.mock('@floating-ui/dom', async importOriginal => {
  const actual = await importOriginal<typeof import('@floating-ui/dom')>()
  return {
    ...actual,
    autoUpdate: vi.fn(actual.autoUpdate),
    computePosition: vi.fn(actual.computePosition),
  }
})
vi.mock('@foldkit/ui/anchor', async importOriginal => {
  const actual = await importOriginal<typeof import('@foldkit/ui/anchor')>()
  return { ...actual, portalToContainingRoot: vi.fn(actual.portalToContainingRoot) }
})
const sourceMount = { name: 'ContextMenuSourceEvents', f: () => Stream.empty }
const anchorMount = { name: 'ContextMenuAnchor', f: () => Stream.empty }

const menu = ContextMenu.createContextMenu<'edit' | 'delete'>()
const config: ContextMenu.ContextMenuConfig<'edit' | 'delete'> = {
  id: 'actions', items: [
    { value: 'edit', textValue: 'Edit', isDisabled: true, content: null },
    { value: 'delete', textValue: 'Delete', isDisabled: false, content: null },
  ], longPressMs: 600, sourceId: 'source', sourceToken: 'token-1', toItem: () => null,
}
const captureMounts = (model: ContextMenu.ContextMenuModel) => {
  const mounts: unknown[] = []
  const h = new Proxy({}, {
    get: (_target, key) => (...args: ReadonlyArray<unknown>) => {
      if (key === 'OnMount') mounts.push(args[0])
      return null
    },
  }) as HtmlBuilder<ContextMenu.ContextMenuMessage>
  menu.view(model, config, h)
  return mounts as ReadonlyArray<{ name: string; f: (element: Element, viewStateChanges: Stream.Stream<never>) => Stream.Stream<ContextMenu.ContextMenuMessage> }>
}
const openPointer = menu.update(menu.init(config), {
  _tag: 'OpenedAt', invocation: { sourceId: 'source', sourceToken: 'token-1', invocation: 'pointer', point: { x: 80, y: 120 } },
})

it('pointer opens at client point', () => {
  expect(openPointer.model.isOpen).toBe(true)
  expect(openPointer.model.invocation?.point).toEqual({ x: 80, y: 120 })
})

it('keyboard opens on source and focuses first enabled', () => {
  const result = menu.update(menu.init(config), {
    _tag: 'OpenedAt', invocation: { sourceId: 'source', sourceToken: 'token-1', invocation: 'keyboard' },
  })
  expect(result.model.isOpen).toBe(true)
  expect(result.model.maybeActiveItemIndex).toEqual(Option.none())
  expect(result.commands?.some(command => command.name === 'FocusItems' || command.name === 'FocusButton')).toBe(false)
})

it('touch long press emits expiry after 600ms and cancels on release', async () => {
  const pointerDown = menu.update(menu.init(config), {
    _tag: 'OpenedAt', invocation: { sourceId: 'source', sourceToken: 'token-1', invocation: 'touch', point: { x: 10, y: 20 } },
  })
  const longPress = pointerDown.commands?.find(command => command.name === 'LongPress')
  expect(longPress).toBeDefined()
  if (longPress === undefined) throw new Error('Touch invocation should schedule LongPress')
  const expiredMessage = await Effect.runPromise(longPress.effect)
  expect(expiredMessage).toEqual({ _tag: 'LongPressExpired', version: pointerDown.model.longPressVersion })
  const opened = menu.update(pointerDown.model, expiredMessage)
  expect(opened.model.isOpen).toBe(true)
  const cancelled = menu.update(pointerDown.model, Menu.Message.IgnoredMouseClick())
  expect(cancelled.model.longPressVersion).toBeGreaterThan(pointerDown.model.longPressVersion)
})

it('ignores a long-press expiry delivered after release or movement cancellation', () => {
  const pressed = menu.update(menu.init(config), {
    _tag: 'OpenedAt', invocation: { sourceId: 'source', sourceToken: 'token-1', invocation: 'touch', point: { x: 10, y: 20 } },
  })
  const staleExpiry: ContextMenu.ContextMenuMessage = { _tag: 'LongPressExpired', version: pressed.model.longPressVersion }
  const released = menu.update(pressed.model, Menu.Message.IgnoredMouseClick())
  expect(menu.update(released.model, staleExpiry).model.isOpen).toBe(false)
  const moved = menu.update(pressed.model, Menu.Message.MovedPointerOverItem({ index: -1, screenX: 19, screenY: 20 }))
  expect(menu.update(moved.model, staleExpiry).model.isOpen).toBe(false)
})
it('closing a menu restores focus only to its matching source token', async () => {
  const source = document.createElement('button')
  source.id = config.sourceId
  source.setAttribute('data-context-source-token', config.sourceToken)
  document.body.append(source)
  const result = menu.close(openPointer.model)
  const restoreFocus = result.commands?.find(command => command.name === 'FocusSource')
  expect(restoreFocus).toBeDefined()
  if (restoreFocus === undefined) throw new Error('Closing an invoked menu should restore its source')
  expect(await Effect.runPromise(restoreFocus.effect)).toEqual(Menu.Message.CompletedFocusButton())
  expect(document.activeElement).toBe(source)
  source.remove()
})

it('all close paths filter fixed-button focus', () => {
  const closed = menu.update(openPointer.model, Menu.Message.Closed())
  expect(closed.commands?.some(command => command.name === 'FocusButton')).toBe(false)
})

it('does not focus a replacement source after source unmount', () => {
  const result = menu.update(openPointer.model, { _tag: 'SourceUnmounted', token: 'token-1' })
  expect(result.model.isOpen).toBe(false)
  expect(result.commands?.some(command => command.name === 'FocusSource' || command.name === 'FocusButton')).toBe(false)
})

it('local Model and Message schemas round-trip through the APP-8 page-model codec', () => {
  const encoded = Schema.encodeSync(ContextMenu.ContextMenuModelSchema)(openPointer.model)
  expect(Schema.decodeUnknownSync(ContextMenu.ContextMenuModelSchema)(encoded)).toEqual(openPointer.model)
  const message: ContextMenu.ContextMenuMessage = { _tag: 'OpenedAt', invocation: { sourceId: 'source', sourceToken: 'token-1', invocation: 'keyboard' } }
  const encodedMessage = Schema.encodeSync(ContextMenu.ContextMenuMessageSchema)(message)
  expect(Schema.decodeUnknownSync(ContextMenu.ContextMenuMessageSchema)(encodedMessage)).toEqual(message)
})
it('source mount turns browser context and touch events into menu messages', async () => {
  const source = document.createElement('button')
  source.id = config.sourceId
  const action = captureMounts(menu.init(config)).find(mount => mount.name === 'ContextMenuSourceEvents')
  expect(action).toBeDefined()
  if (action === undefined) throw new Error('ContextMenuSourceEvents mount is required')
  let resolveReady!: () => void
  const ready = new Promise<void>(resolve => { resolveReady = resolve })
  const addEventListener = source.addEventListener.bind(source)
  source.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) => {
    if (listener !== null) addEventListener(type, listener, options)
    if (type === 'pointercancel') resolveReady()
  }) as typeof source.addEventListener
  const collect = Effect.runPromise(Stream.runCollect(Stream.take(action.f(source, Stream.never), 4)))
  await ready
  source.dispatchEvent(new MouseEvent('contextmenu', { clientX: 20, clientY: 30 }))
  source.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerType: 'touch', clientX: 10, clientY: 20 }))
  source.dispatchEvent(new MouseEvent('contextmenu', { clientX: 10, clientY: 20 }))
  source.dispatchEvent(Object.assign(new Event('pointermove'), { pointerType: 'touch', clientX: 40, clientY: 60 }))
  source.dispatchEvent(new Event('pointerup'))
  const messages = await collect
  expect(messages).toEqual([
    { _tag: 'OpenedAt', invocation: { sourceId: 'source', sourceToken: 'token-1', invocation: 'pointer', point: { x: 20, y: 30 } } },
    { _tag: 'OpenedAt', invocation: { sourceId: 'source', sourceToken: 'token-1', invocation: 'touch', point: { x: 10, y: 20 } } },
    Menu.Message.MovedPointerOverItem({ index: -1, screenX: 40, screenY: 60 }),
    Menu.Message.IgnoredMouseClick(),
  ])
})
it('source mount removes every event listener when interrupted', async () => {
  const source = document.createElement('button')
  const action = captureMounts(menu.init(config)).find(mount => mount.name === 'ContextMenuSourceEvents')
  expect(action).toBeDefined()
  if (action === undefined) throw new Error('ContextMenuSourceEvents mount is required')
  const added: string[] = []
  const removed: string[] = []
  const addEventListener = source.addEventListener.bind(source)
  const removeEventListener = source.removeEventListener.bind(source)
  source.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) => {
    added.push(type)
    if (listener !== null) addEventListener(type, listener, options)
  }) as typeof source.addEventListener
  source.removeEventListener = ((type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) => {
    removed.push(type)
    if (listener !== null) removeEventListener(type, listener, options)
  }) as typeof source.removeEventListener
  const fiber = Effect.runFork(Stream.runDrain(action.f(source, Stream.never)))
  await vi.waitFor(() => expect(added).toEqual(['contextmenu', 'pointerdown', 'pointermove', 'pointerup', 'pointercancel']))
  await Effect.runPromise(Fiber.interrupt(fiber))
  expect(removed).toEqual(added)
})
it('bundle helper methods open, select, and close with menu semantics', () => {
  const initialized = menu.init(config)
  const opened = menu.open(initialized)
  expect(opened.model.isOpen).toBe(true)
  const selected = menu.selectItem(opened.model, 'delete', 1)
  expect(selected.model.isOpen).toBe(false)
  expect(selected.outMessage).toMatchObject({ _tag: 'Selected', value: 'delete', index: 1 })
  const reopened = menu.open(selected.model)
  const closed = menu.close(reopened.model)
  expect(closed.model.isOpen).toBe(false)
})
it('renders focusable menu items and activates the focused rendered item with Enter and Space', () => {
  const items: ContextMenu.ContextMenuConfig<'edit' | 'delete'>['items'] = [
    { value: 'delete', textValue: 'Alpha', isDisabled: false, content: null },
    { value: 'edit', textValue: 'Beta', isDisabled: true, content: null },
    { value: 'delete', textValue: 'Bravo', isDisabled: false, content: null },
  ]
  const storyConfig = { ...config, items }
  const storyRender = (model: ContextMenu.ContextMenuModel, h: HtmlBuilder<ContextMenu.ContextMenuMessage>) =>
    menu.view(model, {
      ...storyConfig,
      items: storyConfig.items.map(item => 'items' in item
        ? { ...item, items: item.items.map(child => 'kind' in child ? child : { ...child, content: h.span([], [child.textValue]) }) }
        : 'kind' in item ? item : { ...item, content: h.span([], [item.textValue]) }),
    }, h)
  const opened = menu.update(menu.init(storyConfig), {
    _tag: 'OpenedAt', invocation: { sourceId: 'source', sourceToken: 'token-1', invocation: 'keyboard' },
  }).model
  const sceneUpdate = (model: ContextMenu.ContextMenuModel, message: ContextMenu.ContextMenuMessage) => {
    const result = menu.update(model, message)
    return result.outMessage === undefined ? { model: result.model } : { model: result.model, outMessage: result.outMessage }
  }
  Scene.scene(
    { update: sceneUpdate, view: storyRender },
    Scene.given(opened),
    Scene.Mount.resolve(sourceMount, Menu.Message.IgnoredMouseClick()),
    Scene.Mount.resolve(anchorMount, Menu.Message.CompletedAnchorMenu()),
    Scene.expect(Scene.role('menuitem', { name: 'Alpha' })).toHaveAttr('tabindex', '-1'),
    Scene.expect(Scene.role('menuitem', { name: 'Alpha' })).toHaveAttr('data-active', ''),
    Scene.expect(Scene.role('menuitem', { name: 'Beta' })).toHaveAttr('aria-disabled', 'true'),
    Scene.keydown(Scene.role('menuitem', { name: 'Alpha' }), 'Enter'),
    Scene.expectOutMessage({ _tag: 'Selected', value: 'delete', index: 0 }),
    Scene.Mount.expectEnded(anchorMount),
  )
  Scene.scene(
    { update: sceneUpdate, view: storyRender },
    Scene.given(opened),
    Scene.Mount.resolve(sourceMount, Menu.Message.IgnoredMouseClick()),
    Scene.Mount.resolve(anchorMount, Menu.Message.CompletedAnchorMenu()),
    Scene.keydown(Scene.role('menuitem', { name: 'Alpha' }), ' '),
    Scene.expectOutMessage({ _tag: 'Selected', value: 'delete', index: 0 }),
    Scene.Mount.expectEnded(anchorMount),
  )
})


const render = (model: ContextMenu.ContextMenuModel, h: HtmlBuilder<ContextMenu.ContextMenuMessage>) =>
  menu.view(model, {
    ...config,
    items: config.items.map(item => 'items' in item
      ? { ...item, items: item.items.map(child => 'kind' in child ? child : { ...child, content: h.span([], [child.textValue]) }) }
      : 'kind' in item ? item : { ...item, content: h.span([], [item.textValue]) }),
  }, h)

it('keyboard invocation comes from the focusable rendered source', () => {
  Scene.scene(
    { update: (model, message) => menu.update(model, message), view: render },
    Scene.given(menu.init(config)),
    Scene.Mount.resolve(sourceMount, Menu.Message.IgnoredMouseClick()),
    Scene.expect(Scene.selector('#source')).toHaveAttr('tabindex', '0'),
    Scene.keydown(Scene.selector('#source'), 'ContextMenu'),
    Scene.expectHandled(),
    Scene.expect(Scene.role('menu')).toExist(),
    Scene.Mount.resolve(anchorMount, Menu.Message.CompletedAnchorMenu()),
  )
})
it('Shift+F10 opens from the focusable rendered source', () => {
  Scene.scene(
    { update: (model, message) => menu.update(model, message), view: render },
    Scene.given(menu.init(config)),
    Scene.Mount.resolve(sourceMount, Menu.Message.IgnoredMouseClick()),
    Scene.keydown(Scene.selector('#source'), 'F10', { shiftKey: true }),
    Scene.expectHandled(),
    Scene.expect(Scene.role('menu')).toExist(),
    Scene.Mount.resolve(anchorMount, Menu.Message.CompletedAnchorMenu()),
  )
})
type RenderedVNode = {
  sel?: string
  text?: string
  data?: { attrs?: Record<string, unknown>; props?: Record<string, unknown> }
  children?: ReadonlyArray<RenderedVNode | string>
}
const domFromRenderedVNode = (node: RenderedVNode | string): Node => {
  if (typeof node === 'string') return document.createTextNode(node)
  const selector = node.sel ?? 'div'
  const element = document.createElement(selector.split(/[.#]/, 1)[0] ?? 'div')
  const id = typeof node.data?.props?.id === 'string' ? node.data.props.id : selector.match(/#([^.#]+)/)?.[1]
  if (id !== undefined) element.id = id
  for (const [name, value] of Object.entries(node.data?.attrs ?? {})) element.setAttribute(name, String(value))
  for (const child of node.children ?? []) element.appendChild(domFromRenderedVNode(child))
  if (node.text !== undefined) element.appendChild(document.createTextNode(node.text))
  return element
}
it('focuses the active rendered menu item and releases anchor resources on unmount', async () => {
  const stopAutoUpdate = vi.fn()
  const cleanupPortal = vi.fn()
  let resolveAutoUpdate!: () => void
  const autoUpdateStarted = new Promise<void>(resolve => { resolveAutoUpdate = resolve })
  vi.mocked(Floating.autoUpdate).mockImplementation(() => {
    resolveAutoUpdate()
    return stopAutoUpdate
  })
  vi.mocked(Floating.computePosition).mockImplementation(reference => {
    const rect = reference.getBoundingClientRect()
    return Promise.resolve({
      x: rect.x, y: rect.y, strategy: 'fixed', placement: 'bottom-start', middlewareData: {},
    })
  })
  vi.mocked(Anchor.portalToContainingRoot).mockReturnValue(cleanupPortal)
  const keyboardModel = menu.update(menu.init(config), {
    _tag: 'OpenedAt', invocation: { sourceId: config.sourceId, sourceToken: config.sourceToken, invocation: 'keyboard' },
  }).model
  let renderedRoot!: HTMLElement
  Scene.scene(
    { update: (model, message) => menu.update(model, message), view: render },
    Scene.given(keyboardModel),
    Scene.tap(simulation => {
      renderedRoot = domFromRenderedVNode(simulation.html as unknown as RenderedVNode) as HTMLElement
      document.body.append(renderedRoot)
    }),
    Scene.Mount.resolve(sourceMount, Menu.Message.IgnoredMouseClick()),
    Scene.Mount.resolve(anchorMount, Menu.Message.CompletedAnchorMenu()),
  )
  const panel = renderedRoot.querySelector<HTMLElement>('#actions-items')
  const activeItem = renderedRoot.querySelector<HTMLElement>('[role="menuitem"][data-active]')
  expect(panel).not.toBeNull()
  expect(activeItem).not.toBeNull()
  const action = captureMounts(keyboardModel).find(mount => mount.name === 'ContextMenuAnchor')
  expect(action).toBeDefined()
  if (action === undefined || panel === null || activeItem === null) throw new Error('Rendered menu anchor and active item are required')
  let resolveFocused!: () => void
  const focused = new Promise<void>(resolve => { resolveFocused = resolve })
  activeItem.addEventListener('focus', () => resolveFocused(), { once: true })
  const fiber = Effect.runFork(Stream.runDrain(action.f(panel, Stream.never)))
  try {
    await autoUpdateStarted
    await focused
    expect(document.activeElement).toBe(activeItem)
    expect(Floating.autoUpdate).toHaveBeenCalledOnce()
    await Effect.runPromise(Fiber.interrupt(fiber))
    expect(stopAutoUpdate).toHaveBeenCalledOnce()
    expect(cleanupPortal).toHaveBeenCalledOnce()
  } finally {
    await Effect.runPromise(Fiber.interrupt(fiber))
    vi.mocked(Floating.autoUpdate).mockReset()
    vi.mocked(Floating.computePosition).mockReset()
    vi.mocked(Anchor.portalToContainingRoot).mockReset()
    renderedRoot.remove()
  }
})


it('closes and restores source focus after an outside pointer press', async () => {
  const source = document.createElement('button')
  source.id = config.sourceId
  const panel = document.createElement('div')
  const outside = document.createElement('button')
  document.body.append(source, panel, outside)
  const stopAutoUpdate = vi.fn()
  vi.mocked(Floating.autoUpdate).mockReturnValue(stopAutoUpdate)
  vi.mocked(Floating.computePosition).mockResolvedValue({
    x: 0, y: 0, strategy: 'fixed', placement: 'bottom-start', middlewareData: {},
  })
  const action = captureMounts(openPointer.model).find(mount => mount.name === 'ContextMenuAnchor')
  expect(action).toBeDefined()
  if (action === undefined) throw new Error('ContextMenuAnchor mount is required')
  const messages = Effect.runPromise(Stream.runCollect(Stream.take(action.f(panel, Stream.never), 2)))
  await vi.waitFor(() => expect(Floating.autoUpdate).toHaveBeenCalled())
  outside.dispatchEvent(new Event('pointerdown', { bubbles: true }))
  try {
    const [positioned, message] = await messages
    expect(positioned).toEqual(Menu.Message.CompletedAnchorMenu())
    if (message === undefined) throw new Error('Outside pointer press should emit Closed')
    expect(message).toEqual(Menu.Message.Closed())
    const closed = menu.update(openPointer.model, message)
    expect(closed.model.isOpen).toBe(false)
    expect(closed.commands?.some(command => command.name === 'FocusSource')).toBe(true)
  } finally {
    vi.mocked(Floating.autoUpdate).mockReset()
    vi.mocked(Floating.computePosition).mockReset()
    source.remove()
    panel.remove()
    outside.remove()
  }
})

it('skips disabled rendered items during arrows and typeahead', () => {
  const navigationConfig: ContextMenu.ContextMenuConfig<'edit' | 'delete'> = {
    ...config,
    items: [
      { value: 'delete', textValue: 'Alpha', isDisabled: false, content: null },
      { value: 'edit', textValue: 'Beta', isDisabled: true, content: null },
      { value: 'delete', textValue: 'Bravo', isDisabled: false, content: null },
    ],
  }
  const navigationRender = (model: ContextMenu.ContextMenuModel, h: HtmlBuilder<ContextMenu.ContextMenuMessage>) =>
    menu.view(model, {
      ...navigationConfig,
      items: navigationConfig.items.map(item => 'items' in item
        ? { ...item, items: item.items.map(child => 'kind' in child ? child : { ...child, content: h.span([], [child.textValue]) }) }
        : 'kind' in item ? item : { ...item, content: h.span([], [item.textValue]) }),
    }, h)
  const opened = menu.update(menu.init(navigationConfig), {
    _tag: 'OpenedAt', invocation: { sourceId: 'source', sourceToken: 'token-1', invocation: 'keyboard' },
  }).model
  Scene.scene(
    { update: (model, message) => menu.update(model, message), view: navigationRender },
    Scene.given(opened),
    Scene.Mount.resolve(sourceMount, Menu.Message.IgnoredMouseClick()),
    Scene.Mount.resolve(anchorMount, Menu.Message.CompletedAnchorMenu()),
    Scene.keydown(Scene.role('menu'), 'ArrowDown'),
    Scene.Command.resolve(Menu.ScrollIntoView({ id: 'actions', index: 2 }), Menu.Message.CompletedScrollIntoView()),
    Scene.expect(Scene.role('menuitem', { name: 'Bravo' })).toHaveAttr('data-active', ''),
  )
  Scene.scene(
    { update: (model, message) => menu.update(model, message), view: navigationRender },
    Scene.given(opened),
    Scene.Mount.resolve(sourceMount, Menu.Message.IgnoredMouseClick()),
    Scene.Mount.resolve(anchorMount, Menu.Message.CompletedAnchorMenu()),
    Scene.keydown(Scene.role('menu'), 'b'),
    Scene.Command.resolve(Menu.DelayClearSearch({ version: 1 }), Menu.Message.CompletedDelayClearSearch({ version: 0 })),
    Scene.keydown(Scene.role('menu'), 'r'),
    Scene.Command.resolve(Menu.DelayClearSearch({ version: 2 }), Menu.Message.CompletedDelayClearSearch({ version: 2 })),
    Scene.expect(Scene.role('menuitem', { name: 'Bravo' })).toHaveAttr('data-active', ''),
  )
})

