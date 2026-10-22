import '@wsagency/wseffect-themes/css/alert-dialog.css'
import { Option, Schema } from 'effect'
import { Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as AlertDialog from '@wsagency/wseffect-themes/components/alert-dialog'
import * as Button from '@wsagency/wseffect-themes/components/button'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, PageOutMessage, type PageInputs } from '../contract.js'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'

export const Model = Schema.Struct({ dialog: AlertDialog.Model })
export const Message = defineMessageUnion({ Open: {}, DialogEvent: { message: AlertDialog.Message } })
type Model = typeof Model.Type
type Message = typeof Message.Type
const foldDialog = AlertDialog.fold<Model, Message, typeof PageOutMessage.Type>({
  read: model => Option.some(model.dialog),
  write: (model, dialog) => ({ ...model, dialog }),
  toParentMessage: message => Message.DialogEvent({ message }),
  foldOutMessage: () => model => ({ model }),
})
export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({ model: { dialog: AlertDialog.init({ id: 'gallery-alert-dialog' }) } }),
  update: (model: Model, message: Message) => Message.match(message, {
    Open: () => foldDialog(model, AlertDialog.Message.RequestedOpen()),
    DialogEvent: ({ message: child }) => foldDialog(model, child),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => h.div([], [
    Heading.view({ as: 'h1' }, ['Alert dialog'], h),
    Button.view({ onClick: Message.Open() }, ['Delete record'], h),
    AlertDialog.embed(h, {
      slotId: 'gallery-alert-dialog', model: model.dialog, toParentMessage: message => Message.DialogEvent({ message }),
      title: 'Delete record?', description: 'This action cannot be undone.', cancelLabel: 'Cancel',
    }),
  ])),
})

export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  renderCaptureView(root, request, (h) => h.div([], [
    Button.view({}, ['Delete record'], h),
    AlertDialog.embed(h, {
      slotId: 'capture-alert-dialog',
      model: request.state === 'open' ? { ...AlertDialog.init({ id: 'capture-alert-dialog' }), isOpen: true } : AlertDialog.init({ id: 'capture-alert-dialog' }),
      toParentMessage: () => ({ _tag: 'Noop' }),
      title: 'Delete record?', description: 'This action cannot be undone.', cancelLabel: 'Cancel',
    }),
  ]))
}
