import { PortalAlertDialog } from './alert-dialog.mount.js'
import { brandViewResult } from 'foldkit/brand'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Update from 'foldkit/update'
import { defineView } from 'foldkit/submodel'
import * as UiDialog from '@foldkit/ui/dialog'
import type { RenderInfo } from '@foldkit/ui/dialog'
export { Model, Message, OutMessage, update, open, close, titleId, descriptionId } from '@foldkit/ui/dialog'
import { init as initDialog } from '@foldkit/ui/dialog'
export const init = (config: UiDialog.InitConfig): UiDialog.Model => initDialog({
  ...config,
  focusSelector: `#${config.id}-cancel`,
})

export type EmbedConfig<ParentMessage> = Readonly<{
  slotId: string
  model: UiDialog.Model
  toParentMessage: (message: UiDialog.Message) => ParentMessage
  title: string
  description?: string
  cancelLabel: string
  content?: ReadonlyArray<Html | string>
}>

type ViewInputs = Readonly<{
  title: string
  description?: string
  cancelLabel: string
  content: ReadonlyArray<Html | string>
}>

const view = defineView<UiDialog.Model, UiDialog.Message, ViewInputs>((model, inputs, h) => {
  const hasDescription = inputs.description !== undefined
  const content = (render: RenderInfo): Html => h.dialog([
    ...render.dialog,
    h.Attribute('role', 'alertdialog'),
    h.Class('rt-BaseDialog'),
  ], render.isVisible ? [
    h.div([
      h.Class('rt-BaseDialogOverlay rt-DialogOverlay'),
      h.DataAttribute('state', 'open'),
    ], []),
    h.div([h.Class('rt-BaseDialogScroll rt-DialogScroll')], [
      h.div([h.Class('rt-BaseDialogScrollPadding rt-DialogScrollPadding rt-r-align-center')], [
        h.div([
          ...render.panel,
          h.Class('rt-BaseDialogContent rt-DialogContent rt-r-size-3 rt-r-max-w'),
          h.DataAttribute('state', 'open'),
          h.Style({ '--max-width': '600px' }),
        ], [
          h.h2([...render.title, h.Class('rt-Heading rt-r-size-5 rt-r-mb-3')], [inputs.title]),
          ...(hasDescription ? [h.p([...render.description, h.Class('rt-Text rt-r-size-3')], [inputs.description!])] : []),
          ...inputs.content,
          h.div([h.Class('rt-Flex rt-r-jc-end')], [
            h.button([...render.closeButton, ...render.initialFocus, h.Id(`${model.id}-cancel`), h.Class('rt-reset rt-BaseButton rt-r-size-2 rt-variant-soft rt-Button')], [inputs.cancelLabel]),
          ]),
        ]),
      ]),
    ]),
  ] : [])
  return brandViewResult(h.div([h.OnMount(PortalAlertDialog())], [
    UiDialog.view(model, { hasDescription, toView: content }, h),
  ]), 'wseffect/AlertDialog')
})

export const fold = <ParentModel, ParentMessage, ParentOutMessage>(
  config: Omit<Update.ChildFoldWithDerivedParentOutMessage<ParentModel, ParentMessage, UiDialog.Model, UiDialog.Message, UiDialog.Message, UiDialog.OutMessage, ParentOutMessage>, 'update'>,
): Update.FoldWithOutMessage<ParentModel, ParentMessage, UiDialog.Message, ParentOutMessage> => Update.foldChild({ ...config, update: UiDialog.update })

export const embed = <ParentMessage>(h: HtmlBuilder<ParentMessage>, config: EmbedConfig<ParentMessage>): Html => h.submodel({
  slotId: config.slotId,
  model: config.model,
  view,
  viewInputs: {
    title: config.title,
    description: config.description,
    cancelLabel: config.cancelLabel,
    content: config.content ?? [],
  },
  toParentMessage: config.toParentMessage,
})
