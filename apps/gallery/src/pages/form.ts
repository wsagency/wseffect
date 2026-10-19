import { Schema } from 'effect'
import { Submodel } from 'foldkit'
import { createKeyedLazy, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import * as TextField from '@wsagency/wseffect-themes/components/text-field'
import { galleryPageContract, type PageInputs } from '../contract.js'

const Field = Schema.Struct({ id: Schema.String, label: Schema.String, value: Schema.String })
export const Model = Schema.Struct({ fields: Schema.Array(Field) })
export const Message = defineMessageUnion({ ChangedField: { id: Schema.String, value: Schema.String } })
type Model = typeof Model.Type
type Message = typeof Message.Type
type Field = typeof Field.Type

const keyedField = createKeyedLazy()
const renderField = (id: string, label: string, value: string, h: HtmlBuilder<Message>) => TextField.view({
  id,
  label,
  value,
  onInput: (nextValue) => Message.ChangedField({ id, value: nextValue }),
  type: 'text',
  inputAttributes: [h.DataAttribute('perf', id)],
}, [], h)

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({ model: { fields: Array.from({ length: 200 }, (_, index) => ({ id: `form-field-${index}`, label: `Field ${index}`, value: '' })) } }),
  update: (model: Model, message: Message) => Message.match(message, {
    ChangedField: ({ id, value }) => ({
      model: { fields: model.fields.map((field) => field.id === id ? { ...field, value } : field) },
    }),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => h.div([h.Class('form-grid')], [
    Heading.view({ as: 'h1' }, ['Form performance'], h),
    ...model.fields.map((field: Field) => keyedField(field.id, renderField, [field.id, field.label, field.value, h])),
  ])),
})
