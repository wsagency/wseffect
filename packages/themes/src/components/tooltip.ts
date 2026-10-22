import { Duration } from 'effect'
import * as Option from 'effect/Option'
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
  const toView = (render: RenderInfo): Html => h.div([], [
    h.button([
      ...render.trigger,
      h.Class('rt-reset rt-BaseButton'),
      h.Type('button'),
    ], inputs.trigger),
    ...(render.isVisible ? [h.div([
      ...render.panel,
      h.Attribute('data-state', model.isHovered && !model.isFocused && Duration.toMillis(model.showDelay) > 0 ? 'delayed-open' : 'instant-open'),
      h.Attribute('data-side', (inputs.anchor?.placement ?? 'top').split('-')[0]),
      h.Class('rt-TooltipContent'),
    ], [
      h.p([h.Class('rt-TooltipText')], inputs.content),
      h.svg([
        h.Attribute('width', '10'),
        h.Attribute('height', '5'),
        h.Attribute('viewBox', '0 0 30 10'),
        h.Attribute('preserveAspectRatio', 'none'),
        h.Class('rt-TooltipArrow'),
      ], [
        h.polygon([h.Attribute('points', '0,0 30,0 15,10')], []),
      ]),
    ])] : []),
  ])
  const viewInputs: UiViewInputs = {
    anchor: { placement: 'top', gap: 4, portal: true, ...inputs.anchor },
    toView,
    isDisabled: inputs.isDisabled,
    ariaLabel: inputs.ariaLabel,
    ariaLabelledBy: inputs.ariaLabelledBy,
  }
  return brandViewResult(UiTooltip.view(model, viewInputs, h), 'wseffect/Tooltip')
})

export const reflectShowDelay = (model: UiTooltip.Model, group: TooltipGroupPrimitive.Model): UiTooltip.Model =>
  UiTooltip.reflectShowDelay(model, Duration.millis(TooltipGroupPrimitive.reflectShowDelay(group)))

export const fold = <ParentModel, ParentMessage, ParentOutMessage>(
  config: Omit<Update.ChildFoldWithDerivedParentOutMessage<ParentModel, ParentMessage, UiTooltip.Model, UiTooltip.Message, UiTooltip.Message, UiTooltip.OutMessage, ParentOutMessage>, 'update'> & Readonly<{
    readGroup?: (parentModel: ParentModel) => TooltipGroupPrimitive.Model
  }>,
): Update.FoldWithOutMessage<ParentModel, ParentMessage, UiTooltip.Message, ParentOutMessage> => {
  const { readGroup, ...foldConfig } = config
  const read = (parentModel: ParentModel) => {
    const childModel = foldConfig.read(parentModel)
    return readGroup === undefined
      ? childModel
      : Option.map(childModel, model => model.isOpen || model.isHovered
        ? model
        : reflectShowDelay(model, readGroup(parentModel)))
  }
  return Update.foldChild({ ...foldConfig, read, update: UiTooltip.update })
}

export const embed = <ParentMessage>(h: HtmlBuilder<ParentMessage>, config: EmbedConfig<ParentMessage>): Html => h.submodel({
  slotId: config.slotId,
  model: config.model,
  view,
  viewInputs: config.viewInputs,
  toParentMessage: config.toParentMessage,
})
