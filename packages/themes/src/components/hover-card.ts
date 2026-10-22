import { brandViewResult } from 'foldkit/brand'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Update from 'foldkit/update'
import { defineView } from 'foldkit/submodel'
import * as UiHoverIntent from '@foldkit/ui/hoverIntent'
import type { AnchorConfig } from '@foldkit/ui/anchor'
import type { RenderInfo } from '@foldkit/ui/hoverIntent'
import { AnchorHoverCard } from './hover-card-anchor.js'

export { Model, Message, OutMessage, update, close } from '@foldkit/ui/hoverIntent'
export const init = (config?: Parameters<typeof UiHoverIntent.init>[0]): UiHoverIntent.Model =>
  UiHoverIntent.init({ openDelay: 200, closeDelay: 150, ...config })


export type ViewInputs<Message> = Readonly<{
  id: string
  anchor?: AnchorConfig
  trigger: ReadonlyArray<Html | string>
  content: ReadonlyArray<Html | string>
}>
export type EmbedConfig<Message> = Readonly<{
  slotId: string
  id: string
  model: UiHoverIntent.Model
  toParentMessage: (message: UiHoverIntent.Message) => Message
  viewInputs: ViewInputs<Message>
}>

const view = defineView<UiHoverIntent.Model, UiHoverIntent.Message, ViewInputs<UiHoverIntent.Message>>((model, inputs, h) => {
  const toView = (render: RenderInfo): Html => h.div([], [
    h.button([
      ...render.trigger,
      h.Id(`${inputs.id}-trigger`),
      h.Type('button'),
    ], inputs.trigger),
    ...(render.isVisible ? [h.div([
      ...render.panel,
      h.Id(`${inputs.id}-panel`),
      h.Class('rt-PopperContent rt-HoverCardContent rt-r-size-2'),
      h.OnMount(AnchorHoverCard({ buttonId: `${inputs.id}-trigger`, anchor: { portal: true, gap: 8, ...inputs.anchor } })),
    ], inputs.content)] : []),
  ])
  return brandViewResult(UiHoverIntent.view(model, { toView }, h), 'wseffect/HoverCard')
})

export const fold = <ParentModel, ParentMessage, ParentOutMessage>(
  config: Omit<Update.ChildFoldWithDerivedParentOutMessage<ParentModel, ParentMessage, UiHoverIntent.Model, UiHoverIntent.Message, UiHoverIntent.Message, UiHoverIntent.OutMessage, ParentOutMessage>, 'update'>,
): Update.FoldWithOutMessage<ParentModel, ParentMessage, UiHoverIntent.Message, ParentOutMessage> => Update.foldChild({ ...config, update: UiHoverIntent.update })

export const embed = <ParentMessage>(h: HtmlBuilder<ParentMessage>, config: EmbedConfig<ParentMessage>): Html => h.submodel({
  slotId: config.slotId,
  model: config.model,
  view,
  viewInputs: config.viewInputs,
  toParentMessage: config.toParentMessage,
})
