import type { HtmlBuilder } from 'foldkit/html'
import * as Option from 'effect/Option'
import { defineMessageUnion } from 'foldkit/message'
import * as Stream from 'effect/Stream'
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
const portalMount = { name: 'PortalAlertDialog', f: () => Stream.empty }

describe('themed AlertDialog', () => {
  it('uses alertdialog semantics and focuses Cancel without a dismissing backdrop', () => {
    const initial = AlertDialog.init({ id: 'alert' })
    expect(Option.getOrUndefined(initial.maybeFocusSelector)).toBe('#alert-cancel')
    const alert = UiDialog.open(initial).model
    expect(() => Scene.scene(
      { update, view }, Scene.given({ alert }),
      Scene.Mount.resolve(UiDialog.AcquireResources, AlertDialog.Message.SucceededAcquireResources()),
      Scene.Mount.resolve(portalMount, AlertDialog.Message.CompletedCloseDialog()),
      Scene.expect(Scene.role('alertdialog', { name: 'Delete item?' })).toExist(),
      Scene.expect(Scene.selector('.rt-BaseDialogOverlay')).toHaveAttr('class', 'rt-BaseDialogOverlay rt-DialogOverlay'),
      Scene.expect(Scene.selector('.rt-BaseDialogScroll')).toHaveAttr('class', 'rt-BaseDialogScroll rt-DialogScroll'),
      Scene.expect(Scene.selector('.rt-BaseDialogScrollPadding')).toHaveAttr('class', 'rt-BaseDialogScrollPadding rt-DialogScrollPadding rt-r-align-center'),
      Scene.expect(Scene.selector('.rt-BaseDialogContent')).toHaveAttr('class', 'rt-BaseDialogContent rt-DialogContent rt-r-size-3 rt-r-max-w'),
      Scene.expect(Scene.selector('.rt-BaseDialogScroll .rt-BaseDialogScrollPadding .rt-BaseDialogContent')).toExist(),
      Scene.click(Scene.selector('.rt-BaseDialogOverlay')),
    )).toThrow(/neither it nor any ancestor has a click handler/)
  })

})
