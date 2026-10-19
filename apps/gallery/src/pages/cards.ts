import { Schema } from 'effect'
import { Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Card, Heading, Text } from '@wsagency/wseffect-themes'
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
    Heading.view({ as: 'h1' }, ['Cards'], h),
    Card.view({ variant: 'surface' }, [
      Heading.view({ as: 'h2' }, ['Card sample'], h),
      Text.view({ as: 'p' }, ['A surface card with themed spacing.'], h),
    ], h),
  ])),
})
