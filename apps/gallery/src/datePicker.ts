import { Schema } from 'effect'
import { Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({})
export const Message = defineMessageUnion({
  ChangedDate: { date: Schema.String },
  ShiftDate: { days: Schema.Number },
})

export type Message = typeof Message.Type
export type Inputs = Readonly<{ date: string }>

export const view = Submodel.defineView<typeof Model.Type, Message, Inputs>((_model, inputs, h) =>
  h.div([], [
    h.input([
      h.Id('date-input'),
      h.Type('date'),
      h.DataAttribute('perf', 'shared-date'),
      h.AriaLabel('Shared date'),
      h.Value(inputs.date),
      h.OnInput((date) => Message.ChangedDate({ date })),
    ]),
    h.output([h.Id('date-submodel')], [inputs.date]),
    h.button([
      h.Id('date-submodel-next'),
      h.OnClick(Message.ShiftDate({ days: 1 })),
    ], ['Next day']),
  ]),
)
