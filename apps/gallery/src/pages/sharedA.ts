import { Option, Schema } from 'effect'
import { Submodel } from '@wsagency/wseffect-foldkit'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import * as Text from '@wsagency/wseffect-themes/components/text'
import { galleryPageContract, type PageInputs, PageOutMessage } from '../contract.js'

export const Model = Schema.Struct({ note: Schema.Option(Schema.String) })
export const Message = defineMessageUnion({ PreviousDay: {}, AddNote: {} })
type Model = typeof Model.Type
type Message = typeof Message.Type

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({ model: { note: Option.none() } }),
  update: (model: Model, message: Message) => Message.match(message, {
    PreviousDay: () => ({ model, outMessage: PageOutMessage.RequestedShiftDay({ days: -1 }) }),
    AddNote: () => ({ model: { ...model, note: Option.some('A shared note') } }),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, inputs, h) => h.div([], [
    Heading.view({ as: 'h1' }, ['Shared date (A)'], h),
    h.div([h.Id('date-page-sharedA')], [Text.view({}, [inputs.date], h)]),
    h.p([h.Id('sharedA-note')], [Option.match(model.note, {
      onNone: () => '(none)',
      onSome: note => note,
    })]),
    h.button([h.Id('sharedA-prev'), h.OnClick(Message.PreviousDay()), h.Class('rt-reset rt-BaseButton rt-r-size-2 rt-variant-solid rt-Button')], ['Previous day']),
    h.button([h.Id('sharedA-add-note'), h.OnClick(Message.AddNote()), h.Class('rt-reset rt-BaseButton rt-r-size-2 rt-variant-solid rt-Button')], ['Add note']),
  ])),
})
