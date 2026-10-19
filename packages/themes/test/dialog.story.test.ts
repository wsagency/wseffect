import * as UiDialog from '@foldkit/ui/dialog'
import * as Option from 'effect/Option'
import * as Story from 'foldkit/story'
import { defineMessageUnion } from 'foldkit/message'
import { describe, expect, it } from 'vitest'
import * as Dialog from '../src/components/dialog.js'

const ParentMessage = defineMessageUnion({ GotDialog: { message: Dialog.Message } })
const ParentOutMessage = defineMessageUnion({ Opened: {}, Closed: {} })
type ParentModel = Readonly<{ dialog: Dialog.Model }>
type ParentMessage = typeof ParentMessage.Type
type ParentOutMessage = typeof ParentOutMessage.Type
const gotDialog = (message: Dialog.Message): ParentMessage => ParentMessage.GotDialog({ message })

const foldDialog = Dialog.fold<ParentModel, ParentMessage, ParentOutMessage>({
  read: model => Option.some(model.dialog),
  write: (model, dialog) => ({ ...model, dialog }),
  toParentMessage: gotDialog,
  foldOutMessage: outMessage => parentModel => ({
    model: parentModel,
    outMessage: outMessage._tag === 'Opened' ? ParentOutMessage.Opened() : ParentOutMessage.Closed(),
  }),
})

const update = (model: ParentModel, message: ParentMessage) => ParentMessage.match(message, {
  GotDialog: ({ message: childMessage }) => foldDialog(model, childMessage),
})

describe('Dialog wrapper', () => {
  it('folds RequestedOpen and forwards Opened', () => {
    Story.story(
      update,
      Story.given({ dialog: Dialog.init({ id: 'dialog' }) }),
      Story.message(gotDialog(Dialog.Message.RequestedOpen())),
      Story.expectOutMessage(ParentOutMessage.Opened()),
      Story.Command.resolve(UiDialog.ShowDialog, Dialog.Message.SucceededShowDialog()),
      Story.model(model => expect(model.dialog.isOpen).toBe(true)),
    )
  })
})
