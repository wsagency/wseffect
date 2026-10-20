import { Schema } from 'effect'
import { Submodel } from 'foldkit'
import { Heading, Text } from '@wsagency/wseffect-themes'
import { galleryPageContract, type PageInputs } from '../contract.js'

export const Model = Schema.Struct({})
export const Message = Schema.Struct({ _tag: Schema.Literal('Tick') })
type Model = typeof Model.Type
type Message = typeof Message.Type

const destinations = [
  ['signals', '/capabilities/signals'],
  ['validation', '/capabilities/validation'],
  ['persistence', '/capabilities/persistence'],
  ['browser', '/capabilities/browser'],
  ['island', '/capabilities/island'],
] as const

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({ model: {} }),
  update: (model: Model, _message: Message) => ({ model }),
  view: Submodel.defineView<Model, Message, PageInputs>((_model, _inputs, h) => h.div([h.Id('capability-hub')], [
    Heading.view({ as: 'h1' }, ['Capabilities'], h),
    Text.view({ as: 'p' }, ['Focused, lazy examples of typed browser/application capabilities.'], h),
    ...destinations.map(([label, href]) => h.p([], [h.a([h.Href(href)], [label[0]!.toUpperCase() + label.slice(1)])])),
  ])),
})
