import { brandViewResult } from 'foldkit/brand'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Update from 'foldkit/update'
import { defineView } from 'foldkit/submodel'
import * as UiPopover from '@foldkit/ui/popover'
import type { AnchorConfig } from '@foldkit/ui/anchor'
import type { RenderInfo } from '@foldkit/ui/popover'

export { Model, Message, OutMessage, init, update, open, close, buttonId, arrowId } from '@foldkit/ui/popover'

export type ViewInputs<Message> = Readonly<{
  anchor?: AnchorConfig
  trigger: ReadonlyArray<Html | string>
  content: ReadonlyArray<Html | string>
  ariaLabel?: string
  ariaLabelledBy?: string
  isDisabled?: boolean
  focusSelector?: string
  arrowPadding?: number
}>
export type EmbedConfig<Message> = Readonly<{
  slotId: string
  model: UiPopover.Model
  toParentMessage: (message: UiPopover.Message) => Message
  viewInputs: ViewInputs<Message>
}>

const view = defineView<UiPopover.Model, UiPopover.Message, ViewInputs<UiPopover.Message>>((model, inputs, h) => {
  const toView = (render: RenderInfo): Html => h.div([], [
    h.button([
      ...render.button,
      h.Class('rt-reset rt-BaseButton rt-r-size-2 rt-variant-outline rt-Button'),
      h.DataAttribute('accent-color', ''),
    ], inputs.trigger),
    ...(render.isVisible ? [
      ...(model.isModal ? [h.div([...render.backdrop, h.Class('rt-BaseDialogOverlay')], [])] : []),
      h.div([
        ...render.panel,
        h.Class('rt-PopperContent rt-PopoverContent rt-r-size-2'),
        h.DataAttribute('state', 'open'),
      ], inputs.content),
    ] : []),
  ])
  return brandViewResult(UiPopover.view(model, {
    anchor: { portal: true, gap: 8, ...inputs.anchor },
    toView,
    isDisabled: inputs.isDisabled,
    focusSelector: inputs.focusSelector,
    arrowPadding: inputs.arrowPadding,
    ariaLabel: inputs.ariaLabel,
    ariaLabelledBy: inputs.ariaLabelledBy,
  }, h), 'wseffect/Popover')
})

export const fold = <ParentModel, ParentMessage, ParentOutMessage>(
  config: Omit<Update.ChildFoldWithDerivedParentOutMessage<ParentModel, ParentMessage, UiPopover.Model, UiPopover.Message, UiPopover.Message, UiPopover.OutMessage, ParentOutMessage>, 'update'>,
): Update.FoldWithOutMessage<ParentModel, ParentMessage, UiPopover.Message, ParentOutMessage> => Update.foldChild({ ...config, update: UiPopover.update })

export const embed = <ParentMessage>(h: HtmlBuilder<ParentMessage>, config: EmbedConfig<ParentMessage>): Html => h.submodel({
  slotId: config.slotId,
  model: config.model,
  view,
  viewInputs: config.viewInputs,
  toParentMessage: config.toParentMessage,
})
