import { Option, String } from 'effect'
import type { Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Update from '@wsagency/wseffect-foldkit/update'
import type { AnchorConfig } from '../anchor/index.js'
import * as Menu from './index.js'

export type ContextMenuItem<Value extends string> = Readonly<{
  value: Value
  textValue: string
  isDisabled: boolean
  content: Html
}>
export type ContextMenuSeparator = Readonly<{ kind: 'separator'; id: string }>
export type ContextMenuGroup<Value extends string> = Readonly<{
  id: string
  label: Html
  items: ReadonlyArray<ContextMenuItem<Value> | ContextMenuSeparator>
}>
export type ContextMenuEntry<Value extends string> =
  | ContextMenuItem<Value>
  | ContextMenuGroup<Value>
  | ContextMenuSeparator
export type ContextMenuClasses = Readonly<{
  panel?: string
  item?: string
  group?: string
  groupLabel?: string
  separator?: string
}>
export type ContextMenuConfig<Value extends string> = Readonly<{
  id: string
  sourceId: string
  sourceToken: string
  longPressMs?: 600
  items: ReadonlyArray<ContextMenuEntry<Value>>
  classes?: ContextMenuClasses
  color?: string
  anchor?: AnchorConfig
}>

const flatten = <Value extends string>(
  items: ReadonlyArray<ContextMenuEntry<Value>>,
): ReadonlyArray<ContextMenuItem<Value> | ContextMenuSeparator> =>
  items.flatMap(item => 'items' in item ? item.items : [item])

const isSeparator = <Value extends string>(
  item: ContextMenuItem<Value> | ContextMenuSeparator,
): item is ContextMenuSeparator => 'kind' in item

const firstEnabled = <Value extends string>(
  items: ReadonlyArray<ContextMenuItem<Value> | ContextMenuSeparator>,
): number | undefined => {
  const index = items.findIndex(item => !isSeparator(item) && !item.isDisabled)
  return index < 0 ? undefined : index
}

export type ContextMenuBundle<Value extends string> = Readonly<{
  init: (config: ContextMenuConfig<Value>) => Menu.Model
  update: (model: Menu.Model, message: Menu.Message) => Update.ReturnWithOutMessage<Menu.Model, Menu.Message, Menu.OutMessage<Value>>
  open: (model: Menu.Model) => Update.ReturnWithOutMessage<Menu.Model, Menu.Message, Menu.OutMessage<Value>>
  openAt: (model: Menu.Model, invocation: Menu.ContextInvocation) => Update.ReturnWithOutMessage<Menu.Model, Menu.Message, Menu.OutMessage<Value>>
  close: (model: Menu.Model) => Update.ReturnWithOutMessage<Menu.Model, Menu.Message, Menu.OutMessage<Value>>
  selectItem: (model: Menu.Model, value: Value, index: number) => Update.ReturnWithOutMessage<Menu.Model, Menu.Message, Menu.OutMessage<Value>>
  view: (model: Menu.Model, config: ContextMenuConfig<Value>, h: HtmlBuilder<Menu.Message>) => Html
}>

export const createContextMenu = <Value extends string>(): ContextMenuBundle<Value> => {
  const menu = Menu.create<Value>()
  const view = (model: Menu.Model, config: ContextMenuConfig<Value>, h: HtmlBuilder<Menu.Message>): Html => {
    const items = flatten(config.items)
    const fallbackActive = firstEnabled(items)
    let itemIndex = 0
    const renderItem = (item: ContextMenuItem<Value> | ContextMenuSeparator): Html => {
      const index = itemIndex++
      if (isSeparator(item)) {
        return h.div([
          h.Id(`${config.id}-separator-${item.id}`),
          h.Role('separator'),
          ...(config.classes?.separator === undefined ? [] : [h.Class(config.classes.separator)]),
        ], [])
      }
      const active = Option.match(model.maybeActiveItemIndex, {
        onNone: () => fallbackActive === index,
        onSome: activeIndex => activeIndex === index,
      })
      return h.div([
        h.Id(`${config.id}-item-${index}`),
        h.Role('menuitem'),
        h.Attribute('tabindex', '-1'),
        h.AriaDisabled(item.isDisabled),
        h.OnFocus(Menu.Message.ActivatedItem({ index, activationTrigger: 'Keyboard' })),
        ...(config.classes?.item === undefined ? [] : [h.Class(config.classes.item)]),
        ...(active ? [h.DataAttribute('active', '')] : []),
        ...(!item.isDisabled ? [
          h.OnClick(Menu.Message.SelectedItem({ index, item: item.value })),
          h.OnKeyDownPreventDefault(key =>
            key === 'Enter' || key === ' '
              ? Option.some(Menu.Message.SelectedItem({ index, item: item.value }))
              : Option.none(),
          ),
        ] : []),
      ], [item.content])
    }
    const renderedItems = config.items.map(item => 'items' in item
      ? h.div([
          h.Role('group'),
          ...(config.classes?.group === undefined ? [] : [h.Class(config.classes.group)]),
        ], [
          h.div(config.classes?.groupLabel === undefined ? [] : [h.Class(config.classes.groupLabel)], [item.label]),
          ...item.items.map(renderItem),
        ])
      : renderItem(item))
    const sourceAttributes = [
      ...Menu.contextTriggerAttributes(config.sourceId, config.sourceToken, h),
      h.OnFocus(Menu.Message.IgnoredMouseClick()),
      h.OnBlur(Menu.Message.IgnoredMouseClick()),
    ]
    return h.div(sourceAttributes, [
      h.span([], [config.id]),
      model.isOpen
        ? h.div([
            h.Id(`${config.id}-items`),
            h.Role('menu'),
            h.Attribute('tabindex', '-1'),
            ...(config.color === undefined ? [] : [h.DataAttribute('accent-color', config.color)]),
            ...(config.classes?.panel === undefined ? [] : [h.Class(config.classes.panel)]),
            h.OnMount(Menu.ContextMenuAnchor(
              config.sourceId,
              Option.match(model.maybeContextInvocation, {
                onNone: () => undefined,
                onSome: invocation => invocation.point,
              }),
              config.anchor,
            )),
            h.OnKeyDownFocus((key, modifiers) => {
              const active = Option.getOrElse(model.maybeActiveItemIndex, () => fallbackActive ?? -1)
              if (key === 'Escape') {
                return Option.some({ focusSelector: `#${config.sourceId}`, message: Menu.Message.Closed() })
              }
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
              if (String.isNonEmpty(key) && key.length === 1 && !modifiers.ctrlKey && !modifiers.altKey && !modifiers.metaKey) {
                const search = `${model.searchQuery}${key}`.toLowerCase()
                for (let step = 0; step < items.length; step += 1) {
                  const index = (active + step + items.length) % items.length
                  const item = items[index]
                  if (item !== undefined && !isSeparator(item) && !item.isDisabled && item.textValue.toLowerCase().startsWith(search)) {
                    return Option.some({ focusSelector: `#${config.id}-item-${index}`, message: Menu.Message.Searched({ key, maybeTargetIndex: Option.some(index) }) })
                  }
                }
              }
              return Option.none()
            }),
          ], renderedItems)
        : null,
    ])
  }
  return {
    init: config => Menu.init({ id: config.id }),
    update: menu.update,
    open: menu.open,
    openAt: menu.openAt,
    close: menu.close,
    selectItem: (model, value, index) => menu.selectItem(model, value, index),
    view,
  }
}
