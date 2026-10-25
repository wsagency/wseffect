import { createLazy, type HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import * as Stream from 'effect/Stream'
import { describe, expect, it, vi } from 'vitest'
import * as UiDialog from '@wsagency/wseffect-foldkit-ui/dialog'
import * as AlertDialog from '../src/components/alert-dialog.js'

const Message = defineMessageUnion({ Tick: {}, Rename: {} })
type Message = typeof Message.Type
type Model = { title: string; tick: number }
const update = (model: Model, message: Message) => ({ model: message._tag === 'Rename' ? { ...model, title: 'Changed confirmation' } : { ...model, tick: model.tick + 1 } })
const lazy = createLazy()
const portalMount = { name: 'PortalAlertDialog', f: () => Stream.empty }
const renderAlert = vi.fn((title: string, h: HtmlBuilder<Message>) => AlertDialog.embed(h, {
  slotId: 'alert', model: UiDialog.open(AlertDialog.init({ id: 'alert' })).model, toParentMessage: () => Message.Tick(),
  title, cancelLabel: 'Cancel',
}))
const view = (model: Model, h: HtmlBuilder<Message>) => h.div([], [
  lazy(renderAlert, [model.title, h]),
  h.button([h.OnClick(Message.Tick())], ['Unrelated update']),
  h.button([h.OnClick(Message.Rename())], ['Change title']),
])

describe('AlertDialog execution-counter reuse', () => {
  it('unrelated update executes 0 views; one changed memo argument executes exactly 1 affected view', () => {
    renderAlert.mockClear()
    Scene.scene(
      { update, view }, Scene.given({ title: 'Confirm deletion', tick: 0 }),
      Scene.Mount.resolve(UiDialog.AcquireResources, AlertDialog.Message.SucceededAcquireResources()),
      Scene.Mount.resolve(portalMount, AlertDialog.Message.CompletedCloseDialog()),
      Scene.click(Scene.role('button', { name: 'Unrelated update' })),
      Scene.expect(Scene.text('Confirm deletion')).toExist(),
      Scene.click(Scene.role('button', { name: 'Change title' })),
      Scene.expect(Scene.text('Changed confirmation')).toExist(),
    )
    expect(renderAlert).toHaveBeenCalledTimes(2)
  })
})
