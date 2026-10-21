import * as Option from 'effect/Option'
import * as Story from 'foldkit/story'
import { defineMessageUnion } from 'foldkit/message'
import { describe, expect, it } from 'vitest'
import * as UiDialog from '@foldkit/ui/dialog'
import * as AlertDialog from '../src/components/alert-dialog.js'

const ParentMessage = defineMessageUnion({ Alert: { message: AlertDialog.Message } })
type ParentMessage = typeof ParentMessage.Type
type ParentModel = { alert: AlertDialog.Model }
const send = (message: AlertDialog.Message): ParentMessage => ParentMessage.Alert({ message })
const foldAlert = AlertDialog.fold<ParentModel, ParentMessage, never>({
  read: model => Option.some(model.alert),
  write: (model, alert) => ({ ...model, alert }),
  toParentMessage: send,
  foldOutMessage: () => parent => ({ model: parent }),
})
const update = (model: ParentModel, message: ParentMessage) => ParentMessage.match(message, {
  Alert: ({ message: child }) => foldAlert(model, child),
})

describe('AlertDialog wrapper', () => {
  it('initial focus is Cancel and backdrop does not dismiss', () => {
    Story.story(
      update,
      Story.given({ alert: AlertDialog.init({ id: 'alert', focusSelector: '#alert-cancel' }) }),
      Story.message(send(AlertDialog.Message.RequestedOpen())),
      Story.Command.resolve(UiDialog.ShowDialog, AlertDialog.Message.SucceededShowDialog()),
      Story.model(model => expect(model.alert.isOpen).toBe(true)),
    )
  })
})
