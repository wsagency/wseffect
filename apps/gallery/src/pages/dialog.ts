import { Option, Schema } from 'effect'
import { Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as Button from '@wsagency/wseffect-themes/components/button'
import * as Dialog from '@wsagency/wseffect-themes/components/dialog'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import * as Text from '@wsagency/wseffect-themes/components/text'
import { galleryPageContract, PageOutMessage, type PageInputs } from '../contract.js'

export const Model = Schema.Struct({ dialog: Dialog.Model })
export const Message = defineMessageUnion({
  OpenDialog: {},
  DialogEvent: { message: Dialog.Message },
})
type Model = typeof Model.Type
type Message = typeof Message.Type

const foldDialog = Dialog.fold<Model, Message, typeof PageOutMessage.Type>({
  read: model => Option.some(model.dialog),
  write: (model, dialog) => ({ ...model, dialog }),
  toParentMessage: message => Message.DialogEvent({ message }),
  foldOutMessage: () => model => ({ model }),
})

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({ model: { dialog: Dialog.init({ id: 'gallery-dialog' }) } }),
  update: (model: Model, message: Message) => Message.match(message, {
    OpenDialog: () => foldDialog(model, Dialog.Message.RequestedOpen()),
    DialogEvent: ({ message: dialogMessage }) => foldDialog(model, dialogMessage),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => h.div([], [
    Heading.view({ as: 'h1' }, ['Dialog'], h),
    Text.view({ as: 'p' }, ['Open the dialog to view its accessible title and content.'], h),
    Button.view({ onClick: Message.OpenDialog() }, ['Open dialog'], h),
    Dialog.embed(h, {
      slotId: 'gallery-dialog',
      model: model.dialog,
      toParentMessage: message => Message.DialogEvent({ message }),
      title: 'Dialog example',
      description: 'An accessible dialog example.',
      content: builder => [builder.p([], ['Dialog content'])],
    }),
  ])),
})
