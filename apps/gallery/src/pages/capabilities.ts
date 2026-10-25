import { Schema } from 'effect'
import { Submodel } from '@wsagency/wseffect-foldkit'
import { Grid, Heading, Text } from '@wsagency/wseffect-themes'
import { galleryPageContract, type PageInputs } from '../contract.js'

export const Model = Schema.Struct({})
export const Message = Schema.Struct({ _tag: Schema.Literal('Tick') })
type Model = typeof Model.Type
type Message = typeof Message.Type

const destinations = [
  ['Signals', '/capabilities/signals', 'Typed patches arrive over a real local Server-Sent Events stream.'],
  ['Validation', '/capabilities/validation', 'Keep native validity and accessible error state in sync.'],
  ['Persistence', '/capabilities/persistence', 'Restore typed values and report storage failures.'],
  ['Browser', '/capabilities/browser', 'Explore breakpoints, locale, clipboard, scroll and resize.'],
  ['Island', '/capabilities/island', 'Apply bounded patches to trusted server-owned HTML.'],
] as const

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({ model: {} }),
  update: (model: Model, _message: Message) => ({ model }),
  view: Submodel.defineView<Model, Message, PageInputs>((_model, _inputs, h) => h.div([h.Id('capability-hub')], [
    Heading.view({ as: 'h1' }, ['Capabilities'], h),
    Text.view({ as: 'p' }, ['Focused, lazy examples of typed browser/application capabilities.'], h),
    Grid.view({ columns: { initial: '1', sm: '2', lg: '3' }, gap: '3' }, destinations.map(([label, href, description]) =>
      h.a([h.Href(href), h.Class('capability-card-link')], [
        Text.view({ as: 'span', size: '4', weight: 'medium' }, [label], h),
        Text.view({ as: 'p', size: '2' }, [description], h),
      ]),
    ), h),
  ])),
})
