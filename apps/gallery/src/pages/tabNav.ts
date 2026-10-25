import * as TabNav from '@wsagency/wseffect-themes/components/tab-nav'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { Submodel } from '@wsagency/wseffect-foldkit'
import { Schema } from 'effect'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import { galleryPageContract, type PageInputs } from '../contract.js'

const items = [
  { value: 'overview', href: '#overview', label: 'Overview' },
  { value: 'api', href: '#api', label: 'API' },
] as const
export const Model = Schema.Struct({ currentValue: Schema.String })
export const Message = defineMessageUnion({ Select: { value: Schema.String } })
type Model = typeof Model.Type
type Message = typeof Message.Type
const tabs = (currentValue: string) => ({ items, currentValue, ariaLabel: 'Documentation' })

export const page = galleryPageContract.definePage({
  Model, Message,
  init: () => ({ model: { currentValue: 'overview' } }),
  update: (model: Model, message: Message) => Message.match(message, {
    Select: ({ value }) => ({ model: { currentValue: value } }),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => h.div([], [
    Heading.view({ as: 'h1' }, ['Tab navigation'], h),
    TabNav.view(tabs(model.currentValue), [], h),
    h.section([h.Id('overview')], [Heading.view({ as: 'h2' }, ['Overview'], h), h.p([], ['Gallery overview.'])]),
    h.section([h.Id('api')], [Heading.view({ as: 'h2' }, ['API'], h), h.p([], ['Gallery API reference.'])]),
  ])),
})
