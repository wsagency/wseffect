import '@wsagency/wseffect-themes/css/hover-card.css'
import { Option, Schema } from 'effect'
import { Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as HoverCard from '@wsagency/wseffect-themes/components/hover-card'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, PageOutMessage, type PageInputs } from '../contract.js'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'

export const Model = Schema.Struct({ hoverCard: HoverCard.Model })
export const Message = defineMessageUnion({ HoverCardEvent: { message: HoverCard.Message } })
type Model = typeof Model.Type
type Message = typeof Message.Type
const foldHoverCard = HoverCard.fold<Model, Message, typeof PageOutMessage.Type>({
  read: model => Option.some(model.hoverCard),
  write: (model, hoverCard) => ({ ...model, hoverCard }),
  toParentMessage: message => Message.HoverCardEvent({ message }),
  foldOutMessage: () => model => ({ model }),
})
const cardInputs = { id: 'gallery-person', trigger: ['@radix'], content: ['Radix2Solid profile card.'] }

export const page = galleryPageContract.definePage({
  Model, Message,
  init: () => ({ model: { hoverCard: HoverCard.init() } }),
  update: (model: Model, message: Message) => Message.match(message, {
    HoverCardEvent: ({ message: child }) => foldHoverCard(model, child),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => h.div([], [
    Heading.view({ as: 'h1' }, ['Hover card'], h),
    HoverCard.embed(h, { slotId: 'gallery-hover-card', id: cardInputs.id, model: model.hoverCard, toParentMessage: message => Message.HoverCardEvent({ message }), viewInputs: cardInputs }),
  ])),
})

export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  renderCaptureView(root, request, (h) => HoverCard.embed(h, {
    slotId: 'capture-hover-card', id: 'capture-person',
    model: { ...HoverCard.init(), ...(request.state === 'hover' ? { isOpen: true, isHovered: true } : {}) },
    toParentMessage: () => ({ _tag: 'Noop' }),
    viewInputs: { id: 'capture-person', trigger: ['@radix'], content: [h.p([], ['Radix2Solid profile card.'])] },
  }))
}
