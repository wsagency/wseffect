import { Schema } from 'effect'
import { Submodel } from '@wsagency/wseffect-foldkit'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, type PageInputs } from '../contract.js'

export const Model = Schema.Struct({ initCount: Schema.Number })
export const Message = defineMessageUnion({ Tick: {} })
type Model = typeof Model.Type
type Message = typeof Message.Type

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({ model: { initCount: 1 } }),
  update: (model: Model, message: Message) => Message.match(message, {
    Tick: () => ({ model: { initCount: model.initCount + 1 } }),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, inputs, h) => h.div([], [
    Heading.view({ as: 'h1' }, ['Shared date (B)'], h),
    h.p([h.Id('date-page-sharedB')], [inputs.date]),
    h.p([h.Id('sharedB-init-count')], [String(model.initCount)]),
    h.button([h.Id('sharedB-increment'), h.Type('button'), h.OnClick(Message.Tick())], ['Increment local state']),
  ])),
})
