import type { HtmlBuilder } from 'foldkit/html'
import * as Option from 'effect/Option'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { describe, expect, it } from 'vitest'
import * as UiDialog from '@foldkit/ui/dialog'
import * as AlertDialog from '../src/components/alert-dialog.js'

const Message = defineMessageUnion({ Alert: { message: AlertDialog.Message } })
type Message = typeof Message.Type
type Model = { alert: AlertDialog.Model }
const update = (model: Model, message: Message) => Message.match(message, {
  Alert: ({ message: child }) => ({ model: { ...model, alert: UiDialog.update(model.alert, child).model } }),
})
const view = (model: Model, h: HtmlBuilder<Message>) => AlertDialog.embed(h, {
  slotId: 'alert-dialog', model: model.alert,
  toParentMessage: message => Message.Alert({ message }),
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
      Scene.expect(Scene.selector('.rt-BaseDialogOverlay')).toHaveAttr('class', 'rt-BaseDialogOverlay rt-AlertDialogOverlay'),
      Scene.expect(Scene.selector('.rt-BaseDialogScroll')).toHaveAttr('class', 'rt-BaseDialogScroll rt-AlertDialogScroll'),
      Scene.expect(Scene.selector('.rt-BaseDialogScrollPadding')).toHaveAttr('class', 'rt-BaseDialogScrollPadding rt-AlertDialogScrollPadding rt-r-align-center'),
      Scene.expect(Scene.selector('.rt-BaseDialogContent')).toHaveAttr('class', 'rt-BaseDialogContent rt-AlertDialogContent rt-r-size-3 rt-r-max-w'),
      Scene.expect(Scene.selector('.rt-BaseDialogScroll .rt-BaseDialogScrollPadding .rt-BaseDialogContent')).toExist(),
      Scene.click(Scene.selector('.rt-BaseDialogOverlay')),
    )).toThrow(/neither it nor any ancestor has a click handler/)
  })
  // Pinned R2S alert-dialog.tsx:22-23,31-35 exposes Cancel and Action as sibling controls in the action row.
  it('renders caller action controls after the focused Cancel control', () => {
    const alert = UiDialog.open(AlertDialog.init({ id: 'alert-actions' })).model
    Scene.scene(
      { update, view: (_model, h) => AlertDialog.embed(h, {
        slotId: 'alert-actions', model: alert, toParentMessage: message => Message.Alert({ message }),
        title: 'Delete item?', cancelLabel: 'Cancel',
        actions: [h.button([h.Type('button')], ['Delete'])],
      }) },
      Scene.given({ alert }),
      Scene.Mount.resolve(UiDialog.AcquireResources, AlertDialog.Message.SucceededAcquireResources()),
      Scene.expect(Scene.role('button', { name: 'Cancel' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Delete' })).toExist(),
      Scene.expect(Scene.selector('.rt-Flex')).not.toExist(),
      Scene.expect(Scene.selector('.rt-BaseDialogContent button')).toExist(),
    )
  })

})
