import { Schema } from 'effect'
import { Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import * as Text from '@wsagency/wseffect-themes/components/text'
import { galleryPageContract, type PageInputs } from '../contract.js'

export const Model = Schema.Struct({})
export const Message = defineMessageUnion({ Tick: {} })
type Model = typeof Model.Type
type Message = typeof Message.Type

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({ model: {} }),
  update: (model: Model, message: Message) => Message.match(message, {
    Tick: () => ({ model }),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((_model, inputs, h) => h.div([], [
    Heading.view({ as: 'h1' }, ['Shared date (B)'], h),
    h.p([h.Id('date-page-sharedB')], [inputs.date]),
  ])),
})
