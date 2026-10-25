import { Schema } from 'effect'
import { Submodel } from '@wsagency/wseffect-foldkit'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import { Button, Heading, Text } from '@wsagency/wseffect-themes'
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
  view: Submodel.defineView<Model, Message, PageInputs>((_model, _inputs, h) => h.div([], [
    Heading.view({ as: 'h1' }, ['Buttons'], h),
    Button.view({ type: 'button' }, ['Save changes'], h),
    Text.view({ as: 'p' }, ['Choose an action.'], h),
  ])),
})
