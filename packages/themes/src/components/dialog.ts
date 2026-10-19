import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Update from 'foldkit/update'
import * as UiDialog from '@foldkit/ui/dialog'
import type { Model as DialogModel, Message as DialogMessage, OutMessage as DialogOutMessage, ViewInputs } from '@foldkit/ui/dialog'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'

export { Model, Message, OutMessage, init, update, open, close, titleId, descriptionId } from '@foldkit/ui/dialog'

const sizes = ['1', '2', '3', '4'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })

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
  const size = responsiveClasses(sizeProp, config.size ?? '3')
  const contentClasses = ['rt-DialogContent', ...size.classes]
  const viewInputs: ViewInputs = {
    hasDescription: config.description !== undefined,
    toView: render => h.dialog(
      [...render.dialog, h.Class('rt-Dialog')],
      render.isVisible
        ? [
            h.div([...render.backdrop, h.Class('rt-DialogOverlay')]),
            h.div([...render.panel, h.Class(contentClasses.join(' ')), ...(Object.keys(size.style).length > 0 ? [h.Style(size.style)] : [])], [
              h.button([...render.closeButton, h.Class('rt-DialogClose')], ['Close']),
              h.h2([...render.title, ...render.initialFocus, h.Class('rt-DialogTitle')], [config.title]),
              ...(config.description === undefined ? [] : [h.p([...render.description, h.Class('rt-DialogDescription')], [config.description])]),
              ...config.content(h),
            ]),
          ]
        : [],
    ),
  }
  return h.submodel({
    slotId: config.slotId,
    model: config.model,
    view: UiDialog.view,
    viewInputs,
    toParentMessage: config.toParentMessage,
  })
}
