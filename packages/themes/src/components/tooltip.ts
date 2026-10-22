import { Duration } from 'effect'
import { brandViewResult } from 'foldkit/brand'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Update from 'foldkit/update'
import { defineView } from 'foldkit/submodel'
import * as UiTooltip from '@foldkit/ui/tooltip'
import type { AnchorConfig } from '@foldkit/ui/anchor'
import type { RenderInfo, ViewInputs as UiViewInputs } from '@foldkit/ui/tooltip'
import * as TooltipGroupPrimitive from '@wsagency/wseffect-primitives/tooltip-group'

export { Model, Message, OutMessage, update, triggerId } from '@foldkit/ui/tooltip'
export const init = UiTooltip.init

export type ViewInputs<Message> = Readonly<{
  trigger: ReadonlyArray<Html | string>
  content: ReadonlyArray<Html | string>
  anchor?: AnchorConfig
  group?: TooltipGroupPrimitive.Model
  isDisabled?: boolean
  ariaLabel?: string
  ariaLabelledBy?: string
}>
export type EmbedConfig<Message> = Readonly<{
  slotId: string
  model: UiTooltip.Model
  toParentMessage: (message: UiTooltip.Message) => Message
  viewInputs: ViewInputs<Message>
}>

const view = defineView<UiTooltip.Model, UiTooltip.Message, ViewInputs<UiTooltip.Message>>((model, inputs, h) => {
  const showDelay = inputs.group === undefined ? model.showDelay : Duration.millis(TooltipGroupPrimitive.reflectShowDelay(inputs.group))
  const reflected = UiTooltip.reflectShowDelay(model, showDelay)
  const toView = (render: RenderInfo): Html => h.div([], [
    h.button([
      ...render.trigger,
      h.Class('rt-reset rt-BaseButton'),
      h.Type('button'),
    ], inputs.trigger),
    ...(render.isVisible ? [h.div([
      ...render.panel,
      h.Class('rt-TooltipContent'),
    ], [
      h.p([h.Class('rt-TooltipText')], inputs.content),
    ])] : []),
  ])
  const viewInputs: UiViewInputs = {
    anchor: { placement: 'top', gap: 4, portal: true, ...inputs.anchor },
    toView,
    isDisabled: inputs.isDisabled,
    ariaLabel: inputs.ariaLabel,
    ariaLabelledBy: inputs.ariaLabelledBy,
  }
  return brandViewResult(UiTooltip.view(reflected, viewInputs, h), 'wseffect/Tooltip')
})

export const reflectShowDelay = (model: UiTooltip.Model, group: TooltipGroupPrimitive.Model): UiTooltip.Model =>
  UiTooltip.reflectShowDelay(model, Duration.millis(TooltipGroupPrimitive.reflectShowDelay(group)))

export const fold = <ParentModel, ParentMessage, ParentOutMessage>(
  config: Omit<Update.ChildFoldWithDerivedParentOutMessage<ParentModel, ParentMessage, UiTooltip.Model, UiTooltip.Message, UiTooltip.Message, UiTooltip.OutMessage, ParentOutMessage>, 'update'>,
): Update.FoldWithOutMessage<ParentModel, ParentMessage, UiTooltip.Message, ParentOutMessage> => Update.foldChild({ ...config, update: UiTooltip.update })

export const embed = <ParentMessage>(h: HtmlBuilder<ParentMessage>, config: EmbedConfig<ParentMessage>): Html => h.submodel({
  slotId: config.slotId,
  model: config.model,
  view,
  viewInputs: config.viewInputs,
  toParentMessage: config.toParentMessage,
})
