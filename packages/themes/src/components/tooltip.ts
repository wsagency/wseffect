import { Duration } from 'effect'
import * as Option from 'effect/Option'
import { brandViewResult } from '@wsagency/wseffect-foldkit/brand'
import type { Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Update from '@wsagency/wseffect-foldkit/update'
import { defineView } from '@wsagency/wseffect-foldkit/submodel'
import * as UiTooltip from '@wsagency/wseffect-foldkit-ui/tooltip'
import type { AnchorConfig } from '@wsagency/wseffect-foldkit-ui/anchor'
import type { RenderInfo, ViewInputs as UiViewInputs } from '@wsagency/wseffect-foldkit-ui/tooltip'
import * as TooltipGroup from '@wsagency/wseffect-foldkit-ui/tooltip/group'

export { Model, Message, OutMessage, update, triggerId } from '@wsagency/wseffect-foldkit-ui/tooltip'
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
  const toView = (render: RenderInfo): Html => {
    const state = render.isVisible
      ? model.isHovered && !model.isFocused && Duration.toMillis(model.showDelay) > 0 ? 'delayed-open' : 'instant-open'
      : 'closed'
    const side = (inputs.anchor?.placement ?? 'top').split('-')[0]
    const arrowStyle = {
      position: 'absolute',
      ...(side === 'top' || side === 'bottom' ? { left: '50%' } : { top: '50%' }),
      ...(side === 'top' ? { bottom: '0px' } : side === 'bottom' ? { top: '0px' } : side === 'right' ? { left: '0px' } : { right: '0px' }),
      transform: side === 'top'
        ? 'translateX(-50%) translateY(100%)'
        : side === 'right'
          ? 'translateY(50%) rotate(90deg) translateX(-50%)'
          : side === 'bottom'
            ? 'translateX(-50%) rotate(180deg)'
            : 'translateY(50%) rotate(-90deg) translateX(50%)',
    }
    return h.div([], [
      h.button([
        ...render.trigger,
        h.Class('rt-reset rt-BaseButton rt-r-size-2 rt-variant-outline rt-Button'),
        h.DataAttribute('accent-color', ''),
        h.DataAttribute('state', state),
        h.Type('button'),
      ], inputs.trigger),
      ...(render.isVisible ? [h.div([
        ...render.panel,
        h.DataAttribute('state', state),
        h.Attribute('data-side', side),
        h.Class('rt-TooltipContent'),
      ], [
        h.p([h.Class('rt-Text rt-r-size-1 rt-TooltipText')], inputs.content),
        h.span([h.Style(arrowStyle)], [
          h.svg([
            h.Attribute('width', '10'),
            h.Attribute('height', '5'),
            h.Attribute('viewBox', '0 0 30 10'),
            h.Attribute('preserveAspectRatio', 'none'),
            h.Style({ display: 'block' }),
            h.Class('rt-TooltipArrow'),
          ], [
            h.polygon([h.Attribute('points', '0,0 30,0 15,10')], []),
          ]),
        ]),
      ])] : []),
    ])
  }
  const viewInputs: UiViewInputs = {
    anchor: { placement: 'top', gap: 9, portal: true, ...inputs.anchor },
    toView,
    isDisabled: inputs.isDisabled,
    ariaLabel: inputs.ariaLabel,
    ariaLabelledBy: inputs.ariaLabelledBy,
  }
  return brandViewResult(UiTooltip.view(model, viewInputs, h), 'wseffect/Tooltip')
})

export const reflectShowDelay = (model: UiTooltip.Model, group: TooltipGroup.Model): UiTooltip.Model =>
  UiTooltip.reflectShowDelay(model, Duration.millis(TooltipGroup.reflectShowDelay(group)))

export const fold = <ParentModel, ParentMessage, ParentOutMessage>(
  config: Omit<Update.ChildFoldWithDerivedParentOutMessage<ParentModel, ParentMessage, UiTooltip.Model, UiTooltip.Message, UiTooltip.Message, UiTooltip.OutMessage, ParentOutMessage>, 'update'> & Readonly<{
    readGroup?: (parentModel: ParentModel) => TooltipGroup.Model
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
