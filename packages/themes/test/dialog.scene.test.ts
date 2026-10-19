import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as UiDialog from '@foldkit/ui/dialog'
import * as Dialog from '../src/components/dialog.js'

const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
type Model = Readonly<{ dialog: Dialog.Model }>
const update = (model: Model, _message: Message) => ({ model })
const view = (model: Model, h: HtmlBuilder<Message>) => Dialog.embed(h, {
  slotId: 'confirm-dialog',
  model: model.dialog,
  toParentMessage: () => Message.Tick(),
  title: 'Confirm action',
  description: 'This cannot be undone.',
  size: '3',
  content: builder => [builder.p([], ['Are you sure?'])],
})

describe('themed Dialog', () => {
  it('keeps Foldkit dialog semantics, structural styles, and themed panel classes', () => {
    const dialog = { ...Dialog.init({ id: 'confirm' }), isOpen: true }
    Scene.scene(
      { update, view },
      Scene.given({ dialog }),
      Scene.Mount.resolve(UiDialog.AcquireResources, Dialog.Message.SucceededAcquireResources()),
      Scene.expect(Scene.role('dialog')).toHaveAttr('aria-labelledby', Dialog.titleId(dialog)),
      Scene.expect(Scene.role('dialog')).toHaveStyle('z-index', '2147483600'),
      Scene.expect(Scene.selector('.rt-BaseDialogOverlay')).toHaveAttr('class', 'rt-BaseDialogOverlay rt-DialogOverlay'),
      Scene.expect(Scene.selector('.rt-BaseDialogScroll')).toHaveAttr('class', 'rt-BaseDialogScroll rt-DialogScroll'),
      Scene.expect(Scene.selector('.rt-BaseDialogScrollPadding')).toHaveAttr('class', 'rt-BaseDialogScrollPadding rt-DialogScrollPadding rt-r-align-center'),
      Scene.expect(Scene.selector('.rt-BaseDialogContent')).toHaveAttr('class', 'rt-BaseDialogContent rt-DialogContent rt-r-size-3 rt-r-max-w'),
      Scene.expect(Scene.selector('.rt-BaseDialogContent')).toHaveStyle('--max-width', '600px'),
      Scene.expect(Scene.text('Confirm action')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Close' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Close' })).toHaveAttr('class', 'rt-reset rt-BaseButton rt-r-size-2 rt-variant-soft rt-Button'),
      Scene.expect(Scene.selector('.rt-Flex.rt-r-jc-end')).toExist(),
    )
  })
})
