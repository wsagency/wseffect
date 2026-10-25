import { Schema } from 'effect'
import { Submodel } from '@wsagency/wseffect-foldkit'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import * as Button from '@wsagency/wseffect-themes/components/button'
import * as Flex from '@wsagency/wseffect-themes/components/flex'
import * as Text from '@wsagency/wseffect-themes/components/text'
import * as TextField from '@wsagency/wseffect-themes/components/text-field'

export const Model = Schema.Struct({})
export const Message = defineMessageUnion({
  ChangedDate: { date: Schema.String },
  ShiftDate: { days: Schema.Number },
})

export type Message = typeof Message.Type
export type Inputs = Readonly<{ date: string }>

export const view = Submodel.defineView<typeof Model.Type, Message, Inputs>((_model, inputs, h) =>
  Flex.view({ align: 'center', gap: '3', wrap: 'wrap' }, [
    TextField.view({
      id: 'date-input',
      label: 'Date',
      type: 'date',
      value: inputs.date,
      inputAttributes: [h.DataAttribute('perf', 'shared-date'), h.AriaLabel('Shared date')],
      onInput: (date) => Message.ChangedDate({ date }),
    }, [], h),
    Flex.view({ align: 'center', gap: '2', wrap: 'wrap' }, [
      h.output([h.Id('date-submodel')], [Text.view({ as: 'span', size: '2' }, [inputs.date], h)]),
      h.div([h.Id('date-submodel-next')], [
        Button.view({ type: 'button', variant: 'outline', onClick: Message.ShiftDate({ days: 1 }) }, ['Next day'], h),
      ]),
    ], h),
  ], h),
)
