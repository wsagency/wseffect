import * as Option from 'effect/Option'
import * as Listbox from '../listbox/public.js'
import { childAttributes, type Attribute, type ChildAttribute, type Html, type HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import type * as Update from '@wsagency/wseffect-foldkit/update'

export type SelectItem<Value extends string> = Readonly<{
  value: Value
  textValue: string
  isDisabled: boolean
  content: Html | string
}>
export type SelectSeparator = Readonly<{ kind: 'separator'; id: string }>
export type SelectGroup<Value extends string> = Readonly<{
  id: string
  label: Html
  items: ReadonlyArray<SelectItem<Value> | SelectSeparator>
}>
export type SelectOption<Value extends string> = Readonly<{ value: Value; label: Html }>
export type Appearance<Message> = Readonly<{
  triggerClassName?: string
  contentClassName?: string
  itemClassName?: string
  groupClassName?: string
  labelClassName?: string
  separatorClassName?: string
  itemsScrollClassName?: string
  itemContentClassName?: string
  itemIndicatorClassName?: string
  itemIndicatorContent?: Html
  itemTextClassName?: string
  contentAttributes?: ReadonlyArray<Attribute<Message> | ChildAttribute>
  separatorAttributes?: ReadonlyArray<Attribute<Message> | ChildAttribute>
  triggerAttributes?: ReadonlyArray<Attribute<Message> | ChildAttribute>
  triggerContent?: Html
}>
export type Config<Value extends string> = Readonly<{
  id: string
  selectedValue: Option.Option<Value>
  items: ReadonlyArray<SelectItem<Value> | SelectGroup<Value> | SelectSeparator>
  position: 'popper' | 'item-aligned'
  isModal: false
  appearance?: Appearance<Listbox.Message>
}>
export type SelectModel = Listbox.Model
export const SelectModel = Listbox.Model
export type SelectMessage = Listbox.Message
export const SelectMessage = Listbox.Message
export type Bundle<Value extends string> = Readonly<{
  init(config: Config<Value>): SelectModel
  update(model: SelectModel, message: SelectMessage): Update.ReturnWithOutMessage<SelectModel, SelectMessage, Listbox.OutMessage<Value>>
  selectItem(model: SelectModel, value: Value): Update.ReturnWithOutMessage<SelectModel, SelectMessage, Listbox.OutMessage<Value>>
  open(model: SelectModel): Update.ReturnWithOutMessage<SelectModel, SelectMessage, Listbox.OutMessage<Value>>
  close(model: SelectModel): Update.ReturnWithOutMessage<SelectModel, SelectMessage, Listbox.OutMessage<Value>>
  view(model: SelectModel, config: Config<Value>, h: HtmlBuilder<SelectMessage>): Html
}>

const isSeparator = <Value extends string>(item: SelectItem<Value> | SelectGroup<Value> | SelectSeparator): item is SelectSeparator => 'kind' in item
const flatten = <Value extends string>(items: Config<Value>['items']): ReadonlyArray<SelectItem<Value> | SelectSeparator> => items.flatMap(item => 'items' in item ? item.items : [item])

export const createSelect = <Value extends string>(): Bundle<Value> => {
  const listbox = Listbox.create<SelectItem<Value>, Value>()
  const init = (config: Config<Value>): SelectModel => Listbox.init({
    id: config.id,
    isModal: false,
    anchorMode: config.position === 'item-aligned' ? 'SelectedOrActiveItem' : 'Trigger',
  })
  const update = (model: SelectModel, message: SelectMessage) => listbox.update(model, message)
  const view = (model: SelectModel, config: Config<Value>, h: HtmlBuilder<SelectMessage>): Html => {
    const items = flatten(config.items)
    const appearance = config.appearance
    const groupKeys = new Map<SelectItem<Value>, string>()
    const headings = new Map<string, Html>()
    let segment = 0
    for (const entry of config.items) {
      if (isSeparator(entry)) { segment += 1; continue }
      if ('items' in entry) {
        let inner = 0
        for (const item of entry.items) {
          if (isSeparator(item)) { inner += 1; segment += 1; continue }
          const key = `${entry.id}-${inner}-${segment}`
          groupKeys.set(item, key)
          headings.set(key, entry.label)
        }
      } else groupKeys.set(entry, `ungrouped-${segment}`)
    }
    const flatItems = items.filter((item): item is SelectItem<Value> => !isSeparator(item))
    const selectedValue = Option.getOrNull(config.selectedValue)
    const selected = selectedValue === null
      ? undefined
      : flatItems.find(item => item.value === selectedValue)
    const content = (item: SelectItem<Value>): Html => {
      if (appearance?.itemIndicatorClassName === undefined) return h.span([], [item.content])
      const isSelected = selectedValue === item.value
      return h.span(appearance.itemContentClassName === undefined ? [] : [h.Class(appearance.itemContentClassName)], [
        ...(isSelected ? [h.span([h.Class(appearance.itemIndicatorClassName)], [appearance.itemIndicatorContent ?? null])] : []),
        h.span(appearance.itemTextClassName === undefined ? [] : [h.Class(appearance.itemTextClassName)], [item.content]),
      ])
    }
    
    return listbox.view(model, {
      items: flatItems,
      itemToValue: item => item.value,
      isItemDisabled: item => item.isDisabled,
      itemToSearchText: item => item.textValue,
      itemGroupKey: item => groupKeys.get(item) ?? '',
      groupToHeading: key => {
        const heading = headings.get(key)
        return heading === undefined ? undefined : { content: heading, ...(appearance?.labelClassName === undefined ? {} : { className: appearance.labelClassName }) }
      },
      ...(appearance?.groupClassName === undefined ? {} : { groupClassName: appearance.groupClassName }),
      separatorAttributes: childAttributes([h.Role('separator'), ...(appearance?.separatorAttributes ?? [])]),
      ...(appearance?.separatorClassName === undefined ? {} : { separatorClassName: appearance.separatorClassName }),
      itemToConfig: item => ({ content: content(item), ...(appearance?.itemClassName === undefined ? {} : { className: appearance.itemClassName }) }),
      maybeSelectedValue: config.selectedValue,
      ariaLabel: config.id,
      buttonContent: appearance?.triggerContent ?? (selected ? typeof selected.content === 'string' ? h.span([], [selected.content]) : selected.content : h.span([], [config.id])),
      ...(appearance?.triggerClassName === undefined ? {} : { buttonClassName: appearance.triggerClassName }),
      buttonAttributes: childAttributes([h.Role('combobox'), ...(appearance?.triggerAttributes ?? [])]),
      ...(appearance?.contentClassName === undefined ? {} : { itemsClassName: appearance.contentClassName }),
      itemsAttributes: childAttributes(appearance?.contentAttributes ?? []),
      anchor: { placement: 'bottom-start', gap: 4 },
      ...(appearance?.itemsScrollClassName === undefined ? {} : { itemsScrollClassName: appearance.itemsScrollClassName }),
    }, h)
  }
  return { init, update, view, selectItem: listbox.selectItem, open: listbox.open, close: listbox.close }
}
