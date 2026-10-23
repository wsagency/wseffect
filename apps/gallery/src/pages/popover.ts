import { Option, Schema } from 'effect'
import { Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as Popover from '@wsagency/wseffect-themes/components/popover'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, PageOutMessage, type PageInputs } from '../contract.js'
export const Model = Schema.Struct({ popover: Popover.Model })
export const Message = defineMessageUnion({ Open: {}, PopoverEvent: { message: Popover.Message } })
type Model = typeof Model.Type
type Message = typeof Message.Type
const viewInputs = { trigger: ['Details'], content: ['Popover content for comparison.'], ariaLabel: 'Additional information' }
const foldPopover = Popover.fold<Model, Message, typeof PageOutMessage.Type>({
  read: model => Option.some(model.popover),
  write: (model, popover) => ({ ...model, popover }),
  toParentMessage: message => Message.PopoverEvent({ message }),
  foldOutMessage: () => model => ({ model }),
})

export const page = galleryPageContract.definePage({
  Model, Message,
  init: () => ({ model: { popover: Popover.init({ id: 'gallery-popover' }) } }),
  update: (model: Model, message: Message) => Message.match(message, {
    Open: () => foldPopover(model, Popover.Message.RequestedOpen()),
    PopoverEvent: ({ message: child }) => foldPopover(model, child),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => h.div([], [
    Heading.view({ as: 'h1' }, ['Popover'], h),
    Popover.embed(h, { slotId: 'gallery-popover', model: model.popover, toParentMessage: message => Message.PopoverEvent({ message }), viewInputs }),
  ])),
})
