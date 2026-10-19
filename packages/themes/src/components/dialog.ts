import { brandViewResult } from 'foldkit/brand'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Update from 'foldkit/update'
import * as UiDialog from '@foldkit/ui/dialog'
import type { Model as DialogModel, Message as DialogMessage, OutMessage as DialogOutMessage, ViewInputs } from '@foldkit/ui/dialog'

export { Model, Message, OutMessage, init, update, open, close, titleId, descriptionId } from '@foldkit/ui/dialog'

const sizes = ['1', '2', '3', '4'] as const
const contentClasses = Object.freeze(Object.fromEntries(
  sizes.map(size => [size, `rt-BaseDialogContent rt-DialogContent rt-r-size-${size}`]),
)) as Readonly<Record<(typeof sizes)[number], string>>

export const fold = <ParentModel, ParentMessage, ParentOutMessage, Input = never>(
  config: Omit<Update.ChildFoldWithDerivedParentOutMessage<ParentModel, ParentMessage, DialogModel, Input, DialogMessage, DialogOutMessage, ParentOutMessage>, 'update'>,
) => Update.foldChild({ ...config, update: UiDialog.update })

export type EmbedConfig<Message> = Readonly<{
  slotId: string
  model: DialogModel
  toParentMessage: (message: DialogMessage) => Message
  title: string
  description?: string
  size?: (typeof sizes)[number]
  content: (h: HtmlBuilder<Message>) => ReadonlyArray<Html | string>
}>

export const embed = <Message>(h: HtmlBuilder<Message>, config: EmbedConfig<Message>): Html => {
  const size = config.size ?? '3'
  const viewInputs: ViewInputs = {
    hasDescription: config.description !== undefined,
    toView: render => h.dialog(
      [...render.dialog],
      render.isVisible
        ? [
            h.div([...render.backdrop, h.Class('rt-BaseDialogOverlay rt-DialogOverlay'), h.DataAttribute('state', 'open')], [
              h.div([h.Class('rt-BaseDialogScroll rt-DialogScroll')], [
                h.div([h.Class('rt-BaseDialogScrollPadding rt-DialogScrollPadding rt-r-align-center')], [
                  h.div([...render.panel, h.Class(contentClasses[size]), h.DataAttribute('state', 'open')], [
                    h.div([h.Class('rt-Flex rt-r-jc-end')], [
                      h.button([...render.closeButton, h.Class('rt-reset rt-BaseButton rt-r-size-2 rt-variant-soft rt-Button')], ['Close']),
                    ]),
                    h.h2([...render.title, ...render.initialFocus, h.Class('rt-Heading rt-r-size-5 rt-r-mb-3')], [config.title]),
                    ...(config.description === undefined ? [] : [h.p([...render.description, h.Class('rt-Text rt-r-size-3')], [config.description])]),
                    ...config.content(h),
                  ]),
                ]),
              ]),
            ]),
          ]
        : [],
    ),
  }
  return brandViewResult(h.submodel({
    slotId: config.slotId,
    model: config.model,
    view: UiDialog.view,
    viewInputs,
    toParentMessage: config.toParentMessage,
  }), 'wseffect/Dialog')
}
