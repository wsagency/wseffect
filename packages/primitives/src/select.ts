import * as Option from 'effect/Option'
import * as Listbox from '@foldkit/ui/listbox'
import type { Html, HtmlBuilder } from 'foldkit/html'

export type SelectItem<Value extends string> = {
  value: Value
  textValue: string
  isDisabled: boolean
  content: Html
}
export type SelectGroup<Value extends string> = {
  id: string
  label: Html
  items: ReadonlyArray<SelectItem<Value> | SelectSeparator>
}
export type SelectSeparator = { kind: 'separator'; id: string }
export type SelectOption<Value extends string> = { value: Value; label: Html }
export type SelectConfig<Value extends string> = {
  id: string
  selectedValue: Option.Option<Value>
  items: ReadonlyArray<SelectItem<Value> | SelectGroup<Value> | SelectSeparator>
  position: 'popper' | 'item-aligned'
  isModal: false
}
type UpstreamBundle<Value extends string> = Listbox.Bundle<SelectItem<Value>, Value>
export const SelectModel = Listbox.Model
export type SelectModel = Listbox.Model
export type SelectMessage = Listbox.Message
export const SelectMessage = Listbox.Message
export type SelectBundle<Value extends string> = {
  init(config: SelectConfig<Value>): SelectModel
  update: UpstreamBundle<Value>['update']
  selectItem(model: SelectModel, item: Value): ReturnType<UpstreamBundle<Value>['update']>
  open(model: SelectModel): ReturnType<UpstreamBundle<Value>['update']>
  close(model: SelectModel): ReturnType<UpstreamBundle<Value>['update']>
  view(model: SelectModel, config: SelectConfig<Value>, h: HtmlBuilder<SelectMessage>): Html
}

const isSeparator = <Value extends string>(item: SelectItem<Value> | SelectSeparator): item is SelectSeparator => 'kind' in item
const flatten = <Value extends string>(items: SelectConfig<Value>['items']): ReadonlyArray<SelectItem<Value> | SelectSeparator> =>
  items.flatMap(item => 'items' in item ? item.items : [item])
const selectedItem = <Value extends string>(items: ReadonlyArray<SelectItem<Value> | SelectSeparator>, selected: Option.Option<Value>) =>
  Option.isSome(selected) ? items.find(item => !isSeparator(item) && item.value === selected.value) : undefined

export function createSelect<Value extends string>(): SelectBundle<Value> {
  const listbox = Listbox.create<SelectItem<Value> | SelectSeparator, Value>()
  const valueForSeparator = (config: SelectConfig<Value>): Value => {
    const first = flatten(config.items).find((item): item is SelectItem<Value> => !isSeparator(item))
    if (first !== undefined) return first.value
    if (Option.isSome(config.selectedValue)) return config.selectedValue.value
    return '' as Value
  }
  const init = (config: SelectConfig<Value>): SelectModel => Listbox.init({ id: config.id, isModal: false })
  const update = (model: SelectModel, message: SelectMessage) => listbox.update(model, message)
  const view = (model: SelectModel, config: SelectConfig<Value>, h: HtmlBuilder<SelectMessage>): Html => {
    const items = flatten(config.items)
    const selected = selectedItem(items, config.selectedValue)
    const itemToValue = (item: SelectItem<Value> | SelectSeparator): Value => isSeparator(item) ? valueForSeparator(config) : item.value
    const isItemDisabled = (item: SelectItem<Value> | SelectSeparator): boolean => isSeparator(item) || item.isDisabled
    if (config.position === 'popper') {
      const groupByItem = new Map<SelectItem<Value>, SelectGroup<Value>>()
      for (const group of config.items) {
        if ('items' in group) for (const item of group.items) if (!isSeparator(item)) groupByItem.set(item, group)
      }
      return listbox.view(model, {
        items,
        itemToValue,
        isItemDisabled,
        itemToSearchText: item => isSeparator(item) ? '' : item.textValue,
        itemGroupKey: item => {
          const group = !isSeparator(item) ? groupByItem.get(item) : undefined
          return group?.id ?? ''
        },
        groupToHeading: key => {
          const group = config.items.find(item => 'items' in item && item.id === key)
          return group !== undefined && 'items' in group ? { content: group.label } : undefined
        },
        itemToConfig: item => ({ content: isSeparator(item) ? h.div([h.Role('separator')], []) : item.content }),
        maybeSelectedValue: config.selectedValue,
        buttonContent: selected !== undefined && !isSeparator(selected) ? selected.content : h.span([], [config.id]),
      }, h)
    }
    if (!model.isOpen) return null
    const activeIndex = Option.isSome(model.maybeActiveItemIndex) ? model.maybeActiveItemIndex.value : -1
    const nextEnabled = (start: number, direction: 1 | -1, includeStart: boolean): number | undefined => {
      for (let offset = includeStart ? 0 : 1; offset <= items.length; offset += 1) {
        const index = (start + direction * offset + items.length * 2) % items.length
        const item = items[index]
        if (item !== undefined && !isSeparator(item) && !item.isDisabled) return index
      }
      return undefined
    }
    return h.div([
      h.Id(`${config.id}-listbox`),
      h.Role('listbox'),
      h.AriaLabel(config.id),
      h.OnKeyDownPreventDefault(key => {
        if (key === 'Escape') return Option.some(Listbox.Message.Closed())
        if (key === 'ArrowDown' || key === 'ArrowUp') {
          const index = nextEnabled(activeIndex < 0 ? (key === 'ArrowDown' ? -1 : 0) : activeIndex, key === 'ArrowDown' ? 1 : -1, false)
          return index === undefined ? Option.none() : Option.some(Listbox.Message.ActivatedItem({ index, activationTrigger: 'Keyboard' }))
        }
        if (key === 'Home' || key === 'End') {
          const index = nextEnabled(key === 'Home' ? -1 : 0, key === 'Home' ? 1 : -1, false)
          return index === undefined ? Option.none() : Option.some(Listbox.Message.ActivatedItem({ index, activationTrigger: 'Keyboard' }))
        }
        if (key === 'Enter' || key === ' ') {
          const item = items[activeIndex]
          return item === undefined || isSeparator(item) || item.isDisabled
            ? Option.none()
            : Option.some(Listbox.Message.SelectedItem({ item: item.value }))
        }
        if (key.length !== 1) return Option.none()
        const start = activeIndex < 0 ? -1 : activeIndex
        const query = key.toLocaleLowerCase()
        for (let offset = 1; offset <= items.length; offset += 1) {
          const index = (start + offset + items.length) % items.length
          const item = items[index]
          if (item !== undefined && !isSeparator(item) && !item.isDisabled && item.textValue.toLocaleLowerCase().startsWith(query)) {
            return Option.some(Listbox.Message.ActivatedItem({ index, activationTrigger: 'Keyboard' }))
          }
        }
        return Option.none()
      }),
    ], items.map((item, index) => {
      if (isSeparator(item)) return h.div([h.Id(`${config.id}-separator-${item.id}`), h.Role('separator')], [])
      const isSelected = Option.isSome(config.selectedValue) && config.selectedValue.value === item.value
      const isActive = activeIndex === index
      return h.div([
        h.Id(`${config.id}-option-${item.value}`),
        h.Role('option'),
        h.AriaSelected(isSelected),
        h.AriaDisabled(item.isDisabled),
        h.Attribute('data-active', String(isActive)),
        h.OnClick(Listbox.Message.SelectedItem({ item: item.value })),
      ], [item.content])
    }))
  }
  return { init, update, view, selectItem: listbox.selectItem, open: listbox.open, close: listbox.close }
}
