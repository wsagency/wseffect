import { Option, Schema } from 'effect'
import { Command, Submodel } from '@wsagency/wseffect-foldkit'
import { childAttributes, createKeyedLazy, type HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import * as VirtualList from '@wsagency/wseffect-foldkit-ui/virtualList'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, type PageInputs } from '../contract.js'

const Item = Schema.Struct({
  id: Schema.String,
  value: Schema.String,
  searchValue: Schema.String,
  account: Schema.String,
  region: Schema.String,
  amount: Schema.Number,
})
type Item = typeof Item.Type
const regions = ['North', 'South', 'East', 'West'] as const
const initialItems = Array.from({ length: 10_000 }, (_, index) => ({
  id: `item-${index}`,
  value: `Item ${index}`,
  searchValue: `item ${index}`,
  account: `Account ${index % 117}`,
  region: regions[index % regions.length]!,
  amount: ((index * 379) % 100_000) / 100,
}))
export const Model = Schema.Struct({
  items: Schema.Array(Schema.String),
  sourceItems: Schema.Array(Item),
  list: VirtualList.Model,
  query: Schema.String,
  descending: Schema.Boolean,
  selected: Schema.Option(Schema.String),
})
export const Message = defineMessageUnion({
  FilterChanged: { value: Schema.String },
  ToggleSort: {},
  CellChanged: { id: Schema.String, value: Schema.String },
  SelectedItem: { id: Schema.String },
  ListEvent: { message: VirtualList.Message },
})
type Model = typeof Model.Type
type Message = typeof Message.Type
const keyedRow = createKeyedLazy()

const visibleItems = (sourceItems: ReadonlyArray<Item>, query: string, descending: boolean): ReadonlyArray<string> => {
  const normalizedQuery = query.toLowerCase()
  const itemIds: string[] = []
  if (descending) {
    for (let index = sourceItems.length - 1; index >= 0; index--) {
      const item = sourceItems[index]!
      if (item.searchValue.includes(normalizedQuery)) itemIds.push(item.id)
    }
  } else {
    for (let index = 0; index < sourceItems.length; index++) {
      const item = sourceItems[index]!
      if (item.searchValue.includes(normalizedQuery)) itemIds.push(item.id)
    }
  }
  return itemIds
}
export const renderRow = (
  id: string,
  value: string,
  account: string,
  region: string,
  amount: number,
  selected: boolean,
  index: number,
  h: HtmlBuilder<Message>,
) => h.div([
  h.Id(`vl-row-${index}`),
  h.DataAttribute('perf', 'vl-row'),
], [
  h.span([], [id]),
  h.input([
    h.Type('text'),
    ...(index === 0 ? [h.Id('vl-cell-input'), h.DataAttribute('perf', 'vl-cell-input')] : []),
    h.AriaLabel(`Item ${id}`),
    h.Value(value),
    h.OnInput((nextValue) => Message.CellChanged({ id, value: nextValue })),
  ]),
  h.span([], [account]),
  h.span([], [region]),
  h.span([], [amount.toFixed(2)]),
  h.button([
    h.Type('button'),
    ...(index === 0 ? [h.Id('vl-select'), h.DataAttribute('perf', 'vl-select')] : []),
    h.AriaPressed(selected ? 'true' : 'false'),
    h.OnClick(Message.SelectedItem({ id })),
  ], ['Select']),
])

const listView = VirtualList.view<string>()

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({
    model: {
      items: initialItems.map((item) => item.id),
      sourceItems: initialItems,
      list: VirtualList.init({ id: 'gallery-virtual-list', rowHeightPx: 36 }),
      query: '',
      descending: false,
      selected: Option.none(),
    },
  }),
  update: (model: Model, message: Message) => Message.match(message, {
    FilterChanged: ({ value }) => {
      const items = visibleItems(model.sourceItems, value, model.descending)
      const filtered = { ...model, items, query: value }
      const result = VirtualList.informItemsChanged(model.list, items)
      return {
        model: { ...filtered, list: result.model },
        commands: result.commands?.map((command) => Command.mapMessage(command, (childMessage) => Message.ListEvent({ message: childMessage }))) ?? [],
      }
    },
    ToggleSort: () => {
      const descending = !model.descending
      const items = visibleItems(model.sourceItems, model.query, descending)
      const sorted = { ...model, items, descending }
      const result = VirtualList.informItemsChanged(model.list, items)
      return {
        model: { ...sorted, list: result.model },
        commands: result.commands?.map((command) => Command.mapMessage(command, (childMessage) => Message.ListEvent({ message: childMessage }))) ?? [],
      }
    },
    CellChanged: ({ id, value }) => {
      const sourceItems = model.sourceItems.map((item) => item.id === id
        ? { ...item, value, searchValue: value.toLowerCase() }
        : item)
      return {
        model: {
          ...model,
          sourceItems,
          items: visibleItems(sourceItems, model.query, model.descending),
        },
      }
    },
    SelectedItem: ({ id }) => ({ model: { ...model, selected: Option.some(id) } }),
    ListEvent: ({ message: listMessage }) => {
      const result = VirtualList.update(model.list, listMessage)
      return {
        model: { ...model, list: result.model },
        commands: result.commands?.map((command) => Command.mapMessage(command, (childMessage) => Message.ListEvent({ message: childMessage }))) ?? [],
      }
    },
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => {
    const items = model.items
    return h.div([], [
      Heading.view({ as: 'h1' }, ['Virtual list'], h),
      h.input([
        h.Type('text'),
        h.Id('vl-filter'),
        h.DataAttribute('perf', 'vl-filter'),
        h.AriaLabel('Filter rows'),
        h.Value(model.query),
        h.OnInput((value) => Message.FilterChanged({ value })),
      ]),
      h.button([
        h.Id('vl-sort'),
        h.DataAttribute('perf', 'vl-sort'),
        h.OnClick(Message.ToggleSort()),
      ], ['Sort rows']),
      h.output([h.Id('vl-count')], [String(items.length)]),
      h.submodel({
        slotId: 'virtual-list',
        model: model.list,
        view: listView,
        viewInputs: {
          items,
          itemToKey: (id: string) => id,
          itemToView: (id: string, index: number) => {
            const item = model.sourceItems[Number(id.slice(5))]!
            return keyedRow(item.id, renderRow, [
              item.id,
              item.value,
              item.account,
              item.region,
              item.amount,
              model.selected._tag === 'Some' && model.selected.value === item.id,
              index,
              h,
            ])
          },
          overscan: 4,
          containerAttributes: childAttributes([h.Id('vl-list'), h.Style({ height: '360px' })]),
        },
        toParentMessage: (childMessage) => Message.ListEvent({ message: childMessage }),
      }),
      h.output([h.Id('vl-selected')], [Option.getOrElse(model.selected, () => 'none')]),
    ])
  }),
})
