import { Option, Schema } from 'effect'
import { Command, Submodel } from 'foldkit'
import { createKeyedLazy, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as VirtualList from '@foldkit/ui/virtualList'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, type PageInputs } from '../contract.js'

const Item = Schema.Struct({ id: Schema.String, value: Schema.String })
type Item = typeof Item.Type
const initialItems = Array.from({ length: 10_000 }, (_, index) => ({ id: `item-${index}`, value: `Item ${index}` }))
export const Model = Schema.Struct({
  items: Schema.Array(Item),
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

const visibleItems = (model: Model): ReadonlyArray<Item> => model.items

const sortedItems = (items: ReadonlyArray<Item>, descending: boolean): ReadonlyArray<Item> =>
  descending ? [...items].reverse() : items

export const renderRow = (id: string, value: string, index: number, h: HtmlBuilder<Message>) => h.div([
  h.Id(`vl-row-${index}`),
  h.DataAttribute('perf', 'vl-row'),
], [
  h.span([], [value]),
  ...(index === 0 ? [
    h.input([
      h.Id('vl-cell-input'),
      h.DataAttribute('perf', 'vl-cell-input'),
      h.Value(value),
      h.OnInput((nextValue) => Message.CellChanged({ id, value: nextValue })),
    ]),
    h.button([
      h.Id('vl-select'),
      h.DataAttribute('perf', 'vl-select'),
      h.OnClick(Message.SelectedItem({ id })),
    ], ['Select']),
  ] : []),
])

const listView = VirtualList.view<Item>()

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({
    model: {
      items: initialItems,
      sourceItems: initialItems,
      list: VirtualList.init({ id: 'gallery-virtual-list', rowHeightPx: 36 }),
      query: '',
      descending: false,
      selected: Option.none(),
    },
  }),
  update: (model: Model, message: Message) => Message.match(message, {
    FilterChanged: ({ value }) => {
      const items = model.sourceItems.filter((item) => item.value.toLowerCase().includes(value.toLowerCase()))
      const filtered = { ...model, items, query: value }
      const result = VirtualList.informItemsChanged(model.list, items.map((item) => item.id))
      return {
        model: { ...filtered, list: result.model },
        commands: result.commands?.map((command) => Command.mapMessage(command, (childMessage) => Message.ListEvent({ message: childMessage }))) ?? [],
      }
    },
    ToggleSort: () => {
      const sourceItems = sortedItems(model.sourceItems, !model.descending)
      const items = sourceItems.filter((item) => item.value.toLowerCase().includes(model.query.toLowerCase()))
      const sorted = { ...model, sourceItems, items, descending: !model.descending }
      const result = VirtualList.informItemsChanged(model.list, items.map((item) => item.id))
      return {
        model: { ...sorted, list: result.model },
        commands: result.commands?.map((command) => Command.mapMessage(command, (childMessage) => Message.ListEvent({ message: childMessage }))) ?? [],
      }
    },
    CellChanged: ({ id, value }) => {
      const sourceItems = model.sourceItems.map((item) => item.id === id ? { ...item, value } : item)
      return {
        model: {
          ...model,
          sourceItems,
          items: sourceItems.filter((item) => item.value.toLowerCase().includes(model.query.toLowerCase())),
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
    const items = visibleItems(model)
    return h.div([], [
      Heading.view({ as: 'h1' }, ['Virtual list'], h),
      h.input([
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
          itemToKey: (item: Item) => item.id,
          itemToRowHeightPx: () => 36,
          itemToView: (item: Item, index: number) => keyedRow(item.id, renderRow, [item.id, item.value, index, h]),
          overscan: 4,
          containerAttributes: [h.Id('vl-list'), h.Style({ height: '360px' })],
        },
        toParentMessage: (childMessage) => Message.ListEvent({ message: childMessage }),
      }),
      h.output([h.Id('vl-selected')], [Option.getOrElse(model.selected, () => 'none')]),
    ])
  }),
})
