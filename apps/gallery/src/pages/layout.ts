import { Schema } from 'effect'
import { Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Box, Flex, Grid, Heading, Text } from '@wsagency/wseffect-themes'
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
    Heading.view({ as: 'h1' }, ['Layout'], h),
    Box.view({ p: '3' }, ['Box layout'], h),
    Flex.view({ gap: '3' }, ['Flex layout'], h),
    Grid.view({ columns: '2', gap: '3' }, ['Grid layout'], h),
    Text.view({ as: 'p' }, ['Arrange content with Box, Flex, and Grid.'], h),
  ])),
})
