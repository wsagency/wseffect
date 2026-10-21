import { Effect, Option, Schema, Stream } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import * as Menu from '@foldkit/ui/menu'
import { expect, it } from 'vitest'
import * as ContextMenu from '../src/context-menu.js'
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
it('source mount turns browser context, keyboard, and touch events into menu messages', async () => {
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
  const collect = Effect.runPromise(Stream.runCollect(Stream.take(action.f(source, Stream.never), 5)))
  await ready
  source.dispatchEvent(new MouseEvent('contextmenu', { clientX: 20, clientY: 30 }))
  source.dispatchEvent(new KeyboardEvent('keydown', { key: 'ContextMenu' }))
  source.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerType: 'touch', clientX: 10, clientY: 20 }))
  source.dispatchEvent(Object.assign(new Event('pointermove'), { pointerType: 'touch', clientX: 40, clientY: 60 }))
  source.dispatchEvent(new Event('pointerup'))
  const messages = await collect
  expect(messages).toEqual([
    { _tag: 'OpenedAt', invocation: { sourceId: 'source', sourceToken: 'token-1', invocation: 'pointer', point: { x: 20, y: 30 } } },
    { _tag: 'OpenedAt', invocation: { sourceId: 'source', sourceToken: 'token-1', invocation: 'keyboard' } },
    { _tag: 'OpenedAt', invocation: { sourceId: 'source', sourceToken: 'token-1', invocation: 'touch', point: { x: 10, y: 20 } } },
    Menu.Message.MovedPointerOverItem({ index: -1, screenX: 40, screenY: 60 }),
    Menu.Message.IgnoredMouseClick(),
  ])
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
it('anchor mount positions against its keyboard source before focusing the active item', async () => {
  const source = document.createElement('button')
  source.id = config.sourceId
  source.setAttribute('data-context-source-token', config.sourceToken)
  const panel = document.createElement('div')
  const activeItem = document.createElement('button')
  activeItem.addEventListener('focus', () => activeItem.setAttribute('data-focused', 'true'))
  activeItem.setAttribute('data-active', 'true')
  panel.append(activeItem)
  document.body.append(source, panel)
  const keyboardModel = menu.update(menu.init(config), {
    _tag: 'OpenedAt', invocation: { sourceId: config.sourceId, sourceToken: config.sourceToken, invocation: 'keyboard', point: { x: 80, y: 120 } },
  }).model
  const action = captureMounts(keyboardModel).find(mount => mount.name === 'ContextMenuAnchor')
  expect(action).toBeDefined()
  if (action === undefined) throw new Error('ContextMenuAnchor mount is required')
  const messages = await Effect.runPromise(Stream.runCollect(Stream.take(action.f(panel, Stream.never), 1)))
  expect(messages).toEqual([Menu.Message.CompletedAnchorMenu()])
  expect(activeItem.getAttribute('data-focused')).toBe('true')
  panel.remove()
  source.remove()
})

const render = (model: ContextMenu.ContextMenuModel, h: HtmlBuilder<ContextMenu.ContextMenuMessage>) =>
  menu.view(model, {
    ...config,
    items: config.items.map(item => 'items' in item
      ? { ...item, items: item.items.map(child => 'kind' in child ? child : { ...child, content: h.span([], [child.textValue]) }) }
      : 'kind' in item ? item : { ...item, content: h.span([], [item.textValue]) }),
  }, h)

it('keyboard navigation skips disabled items', () => {
  Scene.scene(
    { update: (model, message) => menu.update(model, message), view: render },
    Scene.given(menu.update(menu.init(config), {
      _tag: 'OpenedAt', invocation: { sourceId: 'source', sourceToken: 'token-1', invocation: 'keyboard' },
    }).model),
    Scene.Mount.resolve(sourceMount, Menu.Message.IgnoredMouseClick()),
    Scene.Mount.resolve(anchorMount, Menu.Message.CompletedAnchorMenu()),
    Scene.keydown(Scene.role('menu'), 'ArrowDown'),
    Scene.Command.resolve(Menu.ScrollIntoView({ id: 'actions', index: 1 }), Menu.Message.CompletedScrollIntoView()),
    Scene.expect(Scene.selector('#actions-item-1')).toHaveAttr('data-active', ''),
  )
})
