import { Schema } from 'effect'
import { Submodel } from '@wsagency/wseffect-foldkit'
import { Grid, Heading, Text } from '@wsagency/wseffect-themes'
import { galleryPageContract, type PageInputs } from '../contract.js'

export const Model = Schema.Struct({})
export const Message = Schema.Struct({ _tag: Schema.Literal('Tick') })
type Model = typeof Model.Type
type Message = typeof Message.Type

const destinations = [
  ['Accessibility', '/components/accessibility'],
  ['Alert dialog', '/components/alert-dialog'],
  ['Avatar', '/components/avatar'],
  ['Context menu', '/components/context-menu'],
  ['Data', '/components/data'],
  ['Data table', '/components/data-table'],
  ['Feedback', '/components/feedback'],
  ['Form controls', '/components/forms-extra'],
  ['Hover card', '/components/hover-card'],
  ['Icon button', '/components/icon-button'],
  ['Layout extras', '/components/layout-extra'],
  ['Links', '/components/links'],
  ['Popover', '/components/popover'],
  ['Range slider', '/components/range-slider'],
  ['Scroll area', '/components/scroll-area'],
  ['Select', '/components/select'],
  ['Tab navigation', '/components/tab-nav'],
  ['Theme panel', '/components/theme-panel'],
  ['Tooltip', '/components/tooltip'],
  ['Typography extras', '/components/typography-extra'],
] as const

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({ model: {} }),
  update: (model: Model, _message: Message) => ({ model }),
  view: Submodel.defineView<Model, Message, PageInputs>((_model, _inputs, h) => h.div([h.Id('component-families')], [
    Heading.view({ as: 'h1' }, ['Components'], h),
    Text.view({ as: 'p' }, ['Browse the component families.'], h),
    Grid.view({ columns: { initial: '1', sm: '2', lg: '3' }, gap: '3' }, destinations.map(([label, href]) =>
      h.a([h.Href(href), h.Class('capability-card-link')], [
        Text.view({ as: 'span', size: '4', weight: 'medium' }, [label], h),
      ]),
    ), h),
  ])),
})
