import { Schema } from 'effect'
import { Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import type { Document, HtmlBuilder } from 'foldkit/html'

export const Model = Schema.Struct({
  filter: Schema.String,
  descending: Schema.Boolean,
  selected: Schema.Number,
  cellValue: Schema.String,
  fields: Schema.Array(Schema.String),
  menuTicks: Schema.Number,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ChangedFilter: { value: Schema.String },
  ClickedSort: {},
  ChangedCell: { value: Schema.String },
  ClickedSelect: { index: Schema.Number },
  ChangedFormField: { index: Schema.Number, value: Schema.String },
  ClickedMenusTick: {},
})
export type Message = typeof Message.Type

export type PageView = (model: Model, h: HtmlBuilder<Message>, messages: typeof Message) => Document

export const initialModel: Model = {
  filter: '',
  descending: false,
  selected: -1,
  cellValue: 'Record 00001',
  fields: Array.from({ length: 200 }, (_, index) => `Field ${index + 1}`),
  menuTicks: 0,
}

export const init: Runtime.ApplicationInit<Model, Message> = () => ({ model: initialModel })

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ChangedFilter: ({ value }) => ({ model: { ...model, filter: value } }),
    ClickedSort: () => ({ model: { ...model, descending: !model.descending } }),
    ChangedCell: ({ value }) => ({ model: { ...model, cellValue: value } }),
    ClickedSelect: ({ index }) => ({ model: { ...model, selected: index } }),
    ChangedFormField: ({ index, value }) => {
      const fields = [...model.fields]
      fields[index] = value
      return { model: { ...model, fields } }
    },
    ClickedMenusTick: () => ({ model: { ...model, menuTicks: model.menuTicks + 1 } }),
  })
