import { Effect, Option, Queue, Schema, Stream } from 'effect'
import * as Command from 'foldkit/command'
import * as Menu from '@foldkit/ui/menu'
import { autoUpdate, computePosition, flip, shift, type VirtualElement } from '@floating-ui/dom'
import { portalToContainingRoot } from '@foldkit/ui/anchor'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type * as Mount from 'foldkit/mount'
import type * as Update from 'foldkit/update'

export type ContextMenuItem<Value extends string> = { value: Value; textValue: string; isDisabled: boolean; content: Html }
export type ContextMenuGroup<Value extends string> = { id: string; label: Html; items: ReadonlyArray<ContextMenuItem<Value> | ContextMenuSeparator> }
export type ContextMenuSeparator = { kind: 'separator'; id: string }
export type ContextMenuConfig<Value extends string> = {
  id: string
  items: ReadonlyArray<ContextMenuItem<Value> | ContextMenuGroup<Value> | ContextMenuSeparator>
  longPressMs: 600
  sourceId: string
  sourceToken: string
  toItem(item: Value): Html
}
export const ContextMenuInvocationSchema = Schema.Struct({
  sourceId: Schema.String,
  sourceToken: Schema.String,
  invocation: Schema.Literals(['pointer', 'keyboard', 'touch']),
  point: Schema.optional(Schema.Struct({ x: Schema.Number, y: Schema.Number })),
})
export type ContextMenuInvocation = typeof ContextMenuInvocationSchema.Type
export const LongPressExpiredSchema = Schema.Struct({ _tag: Schema.Literal('LongPressExpired'), version: Schema.Number })
export const SourceUnmountedSchema = Schema.Struct({ _tag: Schema.Literal('SourceUnmounted'), token: Schema.String })
export const OpenedAtSchema = Schema.Struct({ _tag: Schema.Literal('OpenedAt'), invocation: ContextMenuInvocationSchema })
export const ContextMenuModelSchema = Schema.Struct({
  ...Menu.Model.fields,
  invocation: Schema.NullOr(ContextMenuInvocationSchema),
  longPressVersion: Schema.Number,
})
export type ContextMenuModel = typeof ContextMenuModelSchema.Type
export const ContextMenuMessageSchema = Schema.Union([Menu.Message, OpenedAtSchema, LongPressExpiredSchema, SourceUnmountedSchema])
export type ContextMenuMessage = typeof ContextMenuMessageSchema.Type
export type ContextMenuCommand = { _tag: 'FocusSource'; sourceId: string; sourceToken: string }
export type ContextMenuOutMessage<Value extends string> = Menu.OutMessage<Value>
export type ContextMenuBundle<Value extends string> = {
  init(config: ContextMenuConfig<Value>): ContextMenuModel
  update(model: ContextMenuModel, message: ContextMenuMessage): Update.ReturnWithOutMessage<ContextMenuModel, ContextMenuMessage, ContextMenuOutMessage<Value>>
  selectItem(model: ContextMenuModel, item: Value, index: number): Update.ReturnWithOutMessage<ContextMenuModel, ContextMenuMessage, ContextMenuOutMessage<Value>>
  open(model: ContextMenuModel): Update.ReturnWithOutMessage<ContextMenuModel, ContextMenuMessage, ContextMenuOutMessage<Value>>
  close(model: ContextMenuModel): Update.ReturnWithOutMessage<ContextMenuModel, ContextMenuMessage, ContextMenuOutMessage<Value>>
  view(model: ContextMenuModel, config: ContextMenuConfig<Value>, h: HtmlBuilder<ContextMenuMessage>): Html
}

const LongPress = Command.define('LongPress', {
  args: { version: Schema.Number, delay: Schema.Number },
  messages: [LongPressExpiredSchema],
  execute: ({ version, delay }) => Effect.sleep(delay).pipe(Effect.as(LongPressExpiredSchema.make({ _tag: 'LongPressExpired', version }))),
})
const FocusSource = Command.define('FocusSource', {
  args: { sourceId: Schema.String, sourceToken: Schema.String },
  messages: [Menu.Message.CompletedFocusButton],
  execute: ({ sourceId, sourceToken }) => Effect.sync(() => {
    const source = document.getElementById(sourceId)
    if (source?.getAttribute('data-context-source-token') === sourceToken && source instanceof HTMLElement) source.focus()
    return Menu.Message.CompletedFocusButton()
  }),
})
const isSeparator = <Value extends string>(item: ContextMenuItem<Value> | ContextMenuSeparator): item is ContextMenuSeparator => 'kind' in item
const flatten = <Value extends string>(items: ContextMenuConfig<Value>['items']): ReadonlyArray<ContextMenuItem<Value> | ContextMenuSeparator> =>
  items.flatMap(item => 'items' in item ? item.items : [item])
const firstEnabled = <Value extends string>(items: ReadonlyArray<ContextMenuItem<Value> | ContextMenuSeparator>): number | undefined => {
  const index = items.findIndex(item => !isSeparator(item) && !item.isDisabled)
  return index < 0 ? undefined : index
}
const mappedCommands = (commands: ReadonlyArray<Command.Command<Menu.Message>> | undefined): ReadonlyArray<Command.Command<ContextMenuMessage>> =>
  Command.mapMessages(commands ?? [], message => message)
const filteredCommands = (commands: ReadonlyArray<Command.Command<ContextMenuMessage>>): ReadonlyArray<Command.Command<ContextMenuMessage>> =>
  commands.filter(command => command.name !== 'FocusButton' && command.name !== 'FocusItems')

export function createContextMenu<Value extends string>(): ContextMenuBundle<Value> {
  const menu = Menu.create<Value>()
  const init = (config: ContextMenuConfig<Value>): ContextMenuModel => ({ ...Menu.init({ id: config.id }), invocation: null, longPressVersion: 0 })
  const update = (model: ContextMenuModel, message: ContextMenuMessage): Update.ReturnWithOutMessage<ContextMenuModel, ContextMenuMessage, ContextMenuOutMessage<Value>> => {
    const closeWithSource = (base: Update.ReturnWithOutMessage<Menu.Model, Menu.Message, Menu.OutMessage<Value>>, current: ContextMenuModel, restoreFocus: boolean) => {
      const commands = filteredCommands(mappedCommands(base.commands))
      const sourceCommand = restoreFocus && current.invocation !== null
        ? [Command.mapMessage(FocusSource({ sourceId: current.invocation.sourceId, sourceToken: current.invocation.sourceToken }), value => value)]
        : []
      return {
        model: { ...base.model, invocation: null, longPressVersion: current.longPressVersion + 1 },
        ...(base.outMessage === undefined ? {} : { outMessage: base.outMessage as ContextMenuOutMessage<Value> }),
        commands: [...commands, ...sourceCommand],
      }
    }
    if (message._tag === 'OpenedAt') {
      if (message.invocation.sourceId === '' || message.invocation.sourceToken === '') return { model }
      const version = model.longPressVersion + 1
      if (message.invocation.invocation === 'touch') {
        return { model: { ...model, invocation: message.invocation, longPressVersion: version }, commands: [LongPress({ version, delay: 600 })] }
      }
      const opened = menu.update(model, Menu.Message.Opened({ maybeActiveItemIndex: Option.none() }))
      return { ...opened, model: { ...opened.model, invocation: message.invocation, longPressVersion: version }, commands: filteredCommands(mappedCommands(opened.commands)) }
    }
    if (message._tag === 'LongPressExpired') {
      if (message.version !== model.longPressVersion || model.invocation === null || model.invocation.invocation !== 'touch') return { model }
      const opened = menu.update(model, Menu.Message.Opened({ maybeActiveItemIndex: Option.none() }))
      return { ...opened, model: { ...opened.model, invocation: model.invocation, longPressVersion: model.longPressVersion }, commands: filteredCommands(mappedCommands(opened.commands)) }
    }
    if (message._tag === 'SourceUnmounted') {
      if (model.invocation?.sourceToken !== message.token) return { model }
      return closeWithSource(menu.update(model, Menu.Message.Closed()), model, false)
    }
    const invalidatesTouch = message._tag === 'IgnoredMouseClick' || message._tag === 'DeactivatedItem'
    if (invalidatesTouch && model.invocation?.invocation === 'touch' && !model.isOpen) {
      const base = menu.update(model, message)
      return { ...base, model: { ...base.model, invocation: null, longPressVersion: model.longPressVersion + 1 }, commands: filteredCommands(mappedCommands(base.commands)) }
    }
    if (message._tag === 'MovedPointerOverItem' && model.invocation?.invocation === 'touch' && !model.isOpen && model.invocation.point !== undefined &&
      (Math.abs(message.screenX - model.invocation.point.x) > 8 || Math.abs(message.screenY - model.invocation.point.y) > 8)) {
      const base = menu.update(model, message)
      return { ...base, model: { ...base.model, invocation: null, longPressVersion: model.longPressVersion + 1 }, commands: filteredCommands(mappedCommands(base.commands)) }
    }
    const base = menu.update(model, message)
    if (message._tag === 'Closed' || (message._tag === 'SelectedItem' && base.model.isOpen === false)) return closeWithSource(base, model, true)
    return { ...base, model: { ...base.model, invocation: base.model.isOpen ? model.invocation : null, longPressVersion: model.longPressVersion }, commands: filteredCommands(mappedCommands(base.commands)) }
  }

  const sourceMount = (config: ContextMenuConfig<Value>): Mount.MountAction<ContextMenuMessage> => ({
    name: 'ContextMenuSourceEvents',
    f: element => Stream.callback<ContextMenuMessage>(queue => Effect.gen(function* () {
      const onContextMenu = (event: Event) => {
        const pointer = event as MouseEvent
        pointer.preventDefault()
        Queue.offerUnsafe(queue, { _tag: 'OpenedAt', invocation: { sourceId: config.sourceId, sourceToken: config.sourceToken, invocation: 'pointer', point: { x: pointer.clientX, y: pointer.clientY } } })
      }
      const onPointerDown = (event: Event) => {
        const pointer = event as PointerEvent
        if (pointer.pointerType === 'touch') Queue.offerUnsafe(queue, { _tag: 'OpenedAt', invocation: { sourceId: config.sourceId, sourceToken: config.sourceToken, invocation: 'touch', point: { x: pointer.clientX, y: pointer.clientY } } })
      }
      const onPointerMove = (event: Event) => {
        const pointer = event as PointerEvent
        if (pointer.pointerType === 'touch') Queue.offerUnsafe(queue, Menu.Message.MovedPointerOverItem({ index: -1, screenX: pointer.clientX, screenY: pointer.clientY }))
      }
      const onPointerUp = () => Queue.offerUnsafe(queue, Menu.Message.IgnoredMouseClick())
      element.addEventListener('contextmenu', onContextMenu)
      element.addEventListener('pointerdown', onPointerDown)
      element.addEventListener('pointermove', onPointerMove)
      element.addEventListener('pointerup', onPointerUp)
      element.addEventListener('pointercancel', onPointerUp)
      yield* Effect.acquireRelease(Effect.void, () => Effect.sync(() => {
        element.removeEventListener('contextmenu', onContextMenu)
        element.removeEventListener('pointerdown', onPointerDown)
        element.removeEventListener('pointermove', onPointerMove)
        element.removeEventListener('pointerup', onPointerUp)
        element.removeEventListener('pointercancel', onPointerUp)
      }))
      return yield* Effect.never
    })),
  })
  const anchorMount = (model: ContextMenuModel, config: ContextMenuConfig<Value>): Mount.MountAction<ContextMenuMessage> => ({
    name: 'ContextMenuAnchor',
    f: element => Stream.callback<ContextMenuMessage>(queue => Effect.gen(function* () {
      const panel = element as HTMLElement
      const source = panel.ownerDocument.getElementById(config.sourceId)
      const portalCleanup = portalToContainingRoot(panel)
      if (source === null) {
        portalCleanup()
        return
      }
      const point = model.invocation?.point
      const virtualReference: VirtualElement = {
        getBoundingClientRect: () => point === undefined
          ? source.getBoundingClientRect()
          : new DOMRect(point.x, point.y, 0, 0),
        contextElement: source,
      }
      const position = () => {
        void computePosition(virtualReference, panel, { strategy: 'fixed', placement: 'bottom-start', middleware: [flip(), shift()] }).then(({ x, y }) => {
          panel.style.position = 'fixed'
          panel.style.left = `${x}px`
          panel.style.top = `${y}px`
          Queue.offerUnsafe(queue, Menu.Message.CompletedAnchorMenu())
          if (model.invocation?.invocation === 'keyboard') panel.querySelector<HTMLElement>('[data-active]')?.focus()
        })
      }
      const stopAutoUpdate = autoUpdate(virtualReference, panel, position)
      yield* Effect.acquireRelease(Effect.void, () => Effect.sync(() => {
        stopAutoUpdate()
        portalCleanup()
      }))
      position()
      return yield* Effect.never
    })),
  })
  const view = (model: ContextMenuModel, config: ContextMenuConfig<Value>, h: HtmlBuilder<ContextMenuMessage>): Html => {
    const items = flatten(config.items)
    const openAtKeyboard = model.invocation?.invocation === 'keyboard'
    const fallbackActive = openAtKeyboard ? firstEnabled(items) : undefined
    let itemIndex = 0
    const renderItem = (item: ContextMenuItem<Value> | ContextMenuSeparator): Html => {
      const index = itemIndex++
      if (isSeparator(item)) return h.div([
        h.Id(`${config.id}-separator-${item.id}`), h.Role('separator'),
        h.Class('rt-BaseMenuSeparator rt-ContextMenuSeparator'),
      ], [])
      const active = Option.isSome(model.maybeActiveItemIndex) ? model.maybeActiveItemIndex.value === index : fallbackActive === index
      return h.div([
        h.Id(`${config.id}-item-${index}`), h.Role('menuitem'), h.Attribute('tabindex', '-1'),
        h.Class('rt-reset rt-BaseMenuItem rt-ContextMenuItem'),
        h.AriaDisabled(item.isDisabled), ...(active ? [h.Attribute('data-active', '')] : []),
        ...(item.isDisabled ? [] : [
          h.OnClick(Menu.Message.SelectedItem({ index, item: item.value })),
          h.OnKeyDownPreventDefault(key => key === 'Enter' || key === ' ' ? Option.some(Menu.Message.SelectedItem({ index, item: item.value })) : Option.none()),
          h.OnFocus(Menu.Message.CompletedFocusButton()),
        ]),
      ], [item.content])
    }
    const renderedItems = config.items.map(item => 'items' in item
      ? h.div([h.Role('group'), h.Class('rt-BaseMenuGroup rt-ContextMenuGroup')], [
        h.div([h.Class('rt-BaseMenuLabel rt-ContextMenuLabel')], [item.label]),
        ...item.items.map(renderItem),
      ])
      : renderItem(item))
    return h.div([
      h.Id(config.sourceId),
      h.Attribute('data-context-source-token', config.sourceToken),
      h.Attribute('tabindex', '0'),
      h.OnFocus(Menu.Message.CompletedFocusButton()),
      h.OnKeyDownSelfPreventDefault((key, modifiers) =>
        key === 'ContextMenu' || (key === 'F10' && modifiers.shiftKey)
          ? Option.some({ _tag: 'OpenedAt', invocation: { sourceId: config.sourceId, sourceToken: config.sourceToken, invocation: 'keyboard' } })
          : Option.none()),
      h.OnMount(sourceMount(config)),
      h.OnUnmount({ _tag: 'SourceUnmounted', token: config.sourceToken }),
    ], [
      h.span([], [config.id]),
      model.isOpen ? h.div([
        h.Id(`${config.id}-items`), h.Role('menu'), h.Attribute('tabindex', '-1'),
        h.Class('rt-PopperContent rt-BaseMenuContent rt-ContextMenuContent'),
        h.OnMount(anchorMount(model, config)),
        h.OnKeyDownFocus((key, modifiers) => {
          const active = Option.isSome(model.maybeActiveItemIndex) ? model.maybeActiveItemIndex.value : fallbackActive ?? -1
          if (key === 'Escape') return Option.some({ focusSelector: `#${config.sourceId}`, message: Menu.Message.Closed() })
          if (key === 'ArrowDown' || key === 'ArrowUp') {
            const direction = key === 'ArrowDown' ? 1 : -1
            for (let step = 1; step <= items.length; step += 1) {
              const index = (active + direction * step + items.length * 2) % items.length
              const item = items[index]
              if (item !== undefined && !isSeparator(item) && !item.isDisabled) {
                return Option.some({ focusSelector: `#${config.id}-item-${index}`, message: Menu.Message.ActivatedItem({ index, activationTrigger: 'Keyboard' }) })
              }
            }
          }
          if (key.length === 1 && !modifiers.ctrlKey && !modifiers.altKey && !modifiers.metaKey) {
            const search = key.toLowerCase()
            for (let step = 1; step <= items.length; step += 1) {
              const index = (active + step + items.length) % items.length
              const item = items[index]
              if (item !== undefined && !isSeparator(item) && !item.isDisabled && item.textValue.toLowerCase().startsWith(search)) {
                return Option.some({ focusSelector: `#${config.id}-item-${index}`, message: Menu.Message.Searched({ key, maybeTargetIndex: Option.some(index) }) })
              }
            }
          }
          return Option.none()
        }),
      ], renderedItems) : null,
    ])
  }
  const selectItem = (model: ContextMenuModel, item: Value, index: number) => update(model, Menu.Message.SelectedItem({ item, index }))
  const open = (model: ContextMenuModel) => {
    const result = menu.open(model)
    return { ...result, model: { ...result.model, invocation: model.invocation, longPressVersion: model.longPressVersion }, commands: filteredCommands(mappedCommands(result.commands)) }
  }
  const close = (model: ContextMenuModel) => update(model, Menu.Message.Closed())
  return { init, update, view, selectItem, open, close }
}
