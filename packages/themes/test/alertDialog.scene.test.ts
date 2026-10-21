import type { HtmlBuilder } from 'foldkit/html'
import * as Option from 'effect/Option'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { describe, expect, it } from 'vitest'
import * as UiDialog from '@foldkit/ui/dialog'
import * as AlertDialog from '../src/components/alert-dialog.js'

const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
type Model = { alert: AlertDialog.Model }
const update = (model: Model, _message: Message) => ({ model })
const view = (model: Model, h: HtmlBuilder<Message>) => AlertDialog.embed(h, {
  slotId: 'alert-dialog', model: model.alert, toParentMessage: () => Message.Tick(),
  title: 'Delete item?', description: 'This cannot be undone.', cancelLabel: 'Cancel',
})

describe('themed AlertDialog', () => {
  it('uses alertdialog semantics and focuses Cancel without a dismissing backdrop', () => {
    const initial = AlertDialog.init({ id: 'alert' })
    expect(Option.getOrUndefined(initial.maybeFocusSelector)).toBe('#alert-cancel')
    const alert = UiDialog.open(initial).model
    expect(() => Scene.scene(
      { update, view }, Scene.given({ alert }),
      Scene.Mount.resolve(UiDialog.AcquireResources, AlertDialog.Message.SucceededAcquireResources()),
      Scene.expect(Scene.role('alertdialog', { name: 'Delete item?' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Cancel' })).toHaveAttr('data-foldkit-dialog-initial-focus', ''),
      Scene.click(Scene.selector('.rt-AlertDialogOverlay')),
    )).toThrow(/neither it nor any ancestor has a click handler/)
  })
})
