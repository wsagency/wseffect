import { Option, Schema } from 'effect'
import { Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as Tooltip from '@wsagency/wseffect-themes/components/tooltip'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, PageOutMessage, type PageInputs } from '../contract.js'

export const Model = Schema.Struct({ tooltip: Tooltip.Model })
export const Message = defineMessageUnion({ TooltipEvent: { message: Tooltip.Message } })
type Model = typeof Model.Type
type Message = typeof Message.Type
const tooltipInputs = { trigger: ['Save'], content: ['Save your changes'], ariaLabel: 'Save changes help' }
const foldTooltip = Tooltip.fold<Model, Message, typeof PageOutMessage.Type>({
  read: model => Option.some(model.tooltip),
  write: (model, tooltip) => ({ ...model, tooltip }),
  toParentMessage: message => Message.TooltipEvent({ message }),
  foldOutMessage: () => model => ({ model }),
})

export const page = galleryPageContract.definePage({
  Model, Message,
  init: () => ({ model: { tooltip: Tooltip.init({ id: 'gallery-tooltip' }) } }),
  update: (model: Model, message: Message) => Message.match(message, {
    TooltipEvent: ({ message: child }) => foldTooltip(model, child),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => h.div([], [
    Heading.view({ as: 'h1' }, ['Tooltip'], h),
    h.button([h.Type('button'), h.DataAttribute('perf', 'tooltip-open')], ['Previous control']),
    h.div([h.DataAttribute('perf', 'tooltip-close')], [
      Tooltip.embed(h, { slotId: 'gallery-tooltip', model: model.tooltip, toParentMessage: message => Message.TooltipEvent({ message }), viewInputs: tooltipInputs }),
    ]),
    h.button([h.Type('button')], ['Continue']),
  ])),
})
