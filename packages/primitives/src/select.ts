import * as Option from 'effect/Option'
import * as Listbox from '@foldkit/ui/listbox'
import { childAttributes, type Html, type HtmlBuilder } from 'foldkit/html'
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
export type SelectAppearance = Readonly<{
  triggerClassName?: string
  contentClassName?: string
  itemClassName?: string
  groupClassName?: string
  labelClassName?: string
  separatorClassName?: string
  triggerContent?: Html
  accentColor?: string
  radius?: string
  highContrast?: boolean
}>
export type SelectConfig<Value extends string> = {
  id: string
  selectedValue: Option.Option<Value>
  items: ReadonlyArray<SelectItem<Value> | SelectGroup<Value> | SelectSeparator>
  position: 'popper' | 'item-aligned'
  isModal: false
  appearance?: SelectAppearance
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

const isSeparator = <Value extends string>(item: SelectItem<Value> | SelectGroup<Value> | SelectSeparator): item is SelectSeparator => 'kind' in item
const flatten = <Value extends string>(items: SelectConfig<Value>['items']): ReadonlyArray<SelectItem<Value> | SelectSeparator> =>
  items.flatMap(item => 'items' in item ? item.items : [item])
const selectedItem = <Value extends string>(items: ReadonlyArray<SelectItem<Value> | SelectSeparator>, selected: Option.Option<Value>) =>
  Option.isSome(selected) ? items.find(item => !isSeparator(item) && item.value === selected.value) : undefined

export function createSelect<Value extends string>(): SelectBundle<Value> {
  const listbox = Listbox.create<SelectItem<Value> | SelectSeparator, Value>()
  const init = (config: SelectConfig<Value>): SelectModel => Listbox.init({ id: config.id, isModal: false })
  const update = (model: SelectModel, message: SelectMessage) => listbox.update(model, message)
  const view = (model: SelectModel, config: SelectConfig<Value>, h: HtmlBuilder<SelectMessage>): Html => {
    const items = flatten(config.items)
    const selected = selectedItem(items, config.selectedValue)
    const appearance = config.appearance
    if (config.position === 'popper') {
      const groupedItems: SelectItem<Value>[] = []
      const groupByItem = new Map<SelectItem<Value>, string>()
      const headingByKey = new Map<string, Html>()
      const hasSeparator = config.items.some(item => isSeparator(item) || ('items' in item && item.items.some(isSeparator)))
      let rootSegment = 0
      for (const item of config.items) {
        if (isSeparator(item)) {
          rootSegment += 1
          continue
        }
        if ('items' in item) {
          let groupSegment = 0
          for (const groupItem of item.items) {
            if (isSeparator(groupItem)) {
              groupSegment += 1
              rootSegment += 1
              continue
            }
            const key = `${item.id}-${groupSegment}-${rootSegment}`
            groupedItems.push(groupItem)
            groupByItem.set(groupItem, key)
            headingByKey.set(key, item.label)
          }
        } else {
          groupedItems.push(item)
          groupByItem.set(item, `ungrouped-${rootSegment}`)
        }
      }
      const markers = () => [
        ...(appearance?.accentColor === undefined ? [] : [h.DataAttribute('accent-color', appearance.accentColor)]),
        ...(appearance?.radius === undefined ? [] : [h.DataAttribute('radius', appearance.radius)]),
      ]
      const separatorValue = groupedItems[0]?.value ?? (Option.isSome(config.selectedValue) ? config.selectedValue.value : '' as Value)
      return listbox.view(model, {
        items: groupedItems,
        itemToValue: item => isSeparator(item) ? separatorValue : item.value,
        isItemDisabled: item => isSeparator(item) || item.isDisabled,
        itemToSearchText: item => isSeparator(item) ? '' : item.textValue,
        itemGroupKey: item => isSeparator(item) ? '' : groupByItem.get(item) ?? '',
        groupToHeading: key => {
          const heading = headingByKey.get(key)
          return heading === undefined
            ? undefined
            : { content: heading, className: appearance?.labelClassName ?? 'rt-SelectLabel' }
        },
        groupClassName: appearance?.groupClassName ?? 'rt-SelectGroup',
        ...(hasSeparator ? { separatorClassName: appearance?.separatorClassName ?? 'rt-SelectSeparator' } : {}),
        itemToConfig: item => ({ content: isSeparator(item) ? h.span([], []) : item.content, className: appearance?.itemClassName ?? 'rt-SelectItem' }),
        maybeSelectedValue: config.selectedValue,
        ariaLabel: config.id,
        buttonContent: appearance?.triggerContent ?? (selected !== undefined && !isSeparator(selected) ? selected.content : h.span([], [config.id])),
        buttonClassName: appearance?.triggerClassName,
        buttonAttributes: childAttributes([h.Role('combobox'), ...markers()]),
        itemsClassName: appearance?.contentClassName,
        itemsAttributes: childAttributes(markers()),
        itemsScrollClassName: 'rt-SelectViewport',
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
    const renderItem = (item: SelectItem<Value> | SelectSeparator, index: number): Html => {
      if (isSeparator(item)) return h.div([h.Id(`${config.id}-separator-${item.id}`), h.Role('separator'), h.Class(appearance?.separatorClassName ?? 'rt-SelectSeparator')], [])
      const isSelected = Option.isSome(config.selectedValue) && config.selectedValue.value === item.value
      const isActive = activeIndex === index
      return h.div([
        h.Id(`${config.id}-item-${index}`),
        h.Role('option'),
        h.AriaSelected(isSelected),
        ...(item.isDisabled ? [h.AriaDisabled(true)] : []),
        h.Attribute('data-active', String(isActive)),
        ...(item.isDisabled ? [] : [h.OnClick(Listbox.Message.SelectedItem({ item: item.value }))]),
        h.Class(appearance?.itemClassName ?? 'rt-SelectItem'),
      ], [item.content])
    }
    let itemIndex = 0
    const children = config.items.map(item => {
      if (!('items' in item)) return renderItem(item, itemIndex++)
      const groupItems = item.items.map(groupItem => renderItem(groupItem, itemIndex++))
      const labelId = `${config.id}-group-label-${item.id}`
      return h.div([
        h.Id(`${config.id}-group-${item.id}`),
        h.Role('group'),
        h.AriaLabelledBy(labelId),
        h.Class(appearance?.groupClassName ?? 'rt-SelectGroup'),
      ], [
        h.div([h.Id(labelId), h.Class(appearance?.labelClassName ?? 'rt-SelectLabel')], [item.label]),
        ...groupItems,
      ])
    })
    const contentClassName = [appearance?.contentClassName, appearance?.highContrast ? 'rt-high-contrast' : undefined].filter(Boolean).join(' ')
    return h.div([
      h.Id(`${config.id}-items`),
      h.Role('listbox'),
      h.AriaLabel(config.id),
      ...(contentClassName.length > 0 ? [h.Class(contentClassName)] : []),
      ...(appearance?.accentColor === undefined ? [] : [h.DataAttribute('accent-color', appearance.accentColor)]),
      ...(appearance?.radius === undefined ? [] : [h.DataAttribute('radius', appearance.radius)]),
      ...(Option.isSome(model.maybeActiveItemIndex)
        ? [h.AriaActiveDescendant(`${config.id}-item-${model.maybeActiveItemIndex.value}`)]
        : []),
      h.Tabindex(-1),
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
          if (key === ' ' && model.searchQuery.length > 0) {
            const query = `${model.searchQuery}${key}`.toLocaleLowerCase()
            const target = items.findIndex(item => !isSeparator(item) && !item.isDisabled && item.textValue.toLocaleLowerCase().startsWith(query))
            return Option.some(Listbox.Message.Searched({ key, maybeTargetIndex: target < 0 ? Option.none() : Option.some(target) }))
          }
          const item = items[activeIndex]
          return item === undefined || isSeparator(item) || item.isDisabled
            ? Option.none()
            : Option.some(Listbox.Message.SelectedItem({ item: item.value }))
        }
        if (key.length !== 1) return Option.none()
        const query = `${model.searchQuery}${key}`.toLocaleLowerCase()
        const index = items.findIndex((item, candidate) =>
          !isSeparator(item) && !item.isDisabled &&
          item.textValue.toLocaleLowerCase().startsWith(query) &&
          (model.searchQuery.length > 0 ? candidate > activeIndex : candidate > activeIndex || activeIndex < 0))
        const wrappedIndex = index >= 0 ? index : items.findIndex(item =>
          !isSeparator(item) && !item.isDisabled && item.textValue.toLocaleLowerCase().startsWith(query))
        return Option.some(Listbox.Message.Searched({
          key,
          maybeTargetIndex: wrappedIndex < 0 ? Option.none() : Option.some(wrappedIndex),
        }))
      }),
    ], [h.div([h.Class('rt-SelectViewport')], children)])
  }
  return { init, update, view, selectItem: listbox.selectItem, open: listbox.open, close: listbox.close }
}
