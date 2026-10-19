import { Schema } from 'effect'
import { Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Heading, Text, TextField } from '@wsagency/wseffect-themes'
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
    Heading.view({ as: 'h1' }, ['Text field'], h),
    TextField.view({ id: 'email-address', label: 'Email address', type: 'email', placeholder: 'name@example.com' }, [], h),
    Text.view({ as: 'p' }, ['Enter an email address.'], h),
  ])),
})
