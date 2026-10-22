import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as UiPopover from '@foldkit/ui/popover'
import * as Popover from '../src/components/popover.js'

const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
type Model = { popover: Popover.Model }
const update = (model: Model, _message: Message) => ({ model })
const view = (model: Model, h: HtmlBuilder<Message>) => Popover.embed(h, {
  slotId: 'popover', model: model.popover, toParentMessage: () => Message.Tick(),
  viewInputs: { trigger: ['Open details'], content: ['Popover details'], ariaLabel: 'Details' },
})

describe('themed Popover', () => {
  it('keeps a labelled nonmodal popup and themed panel classes', () => {
    const popover = UiPopover.open(Popover.init({ id: 'details' })).model
    Scene.scene(
      { update, view }, Scene.given({ popover }),
      Scene.Mount.expectHas(UiPopover.AnchorPopover({ buttonId: 'details-button', anchor: { portal: true, gap: 8 }, arrowId: UiPopover.arrowId('details') })),
      Scene.Mount.resolve(UiPopover.AnchorPopover, UiPopover.Message.CompletedAnchorPopover()),
      Scene.expect(Scene.role('button', { name: 'Details' })).toExist(),
      Scene.expect(Scene.selector('.rt-PopoverContent')).toExist(),
      Scene.expect(Scene.selector('.rt-PopoverContent')).toHaveAttr('class', 'rt-PopperContent rt-PopoverContent rt-r-size-2'),
      Scene.expect(Scene.text('Popover details')).toExist(),
    )
  })
  // Pinned R2S popover.tsx:14-23 preserves its trigger child and emits plain content inside Popover.Content.
  it('keeps the matched outlined trigger and renders plain content without a paragraph wrapper', () => {
    const popover = UiPopover.open(Popover.init({ id: 'details' })).model
    Scene.scene(
      { update, view }, Scene.given({ popover }),
      Scene.Mount.expectHas(UiPopover.AnchorPopover({ buttonId: 'details-button', anchor: { portal: true, gap: 8 }, arrowId: UiPopover.arrowId('details') })),
      Scene.Mount.resolve(UiPopover.AnchorPopover, UiPopover.Message.CompletedAnchorPopover()),
      Scene.expect(Scene.selector('button')).toHaveAttr('class', 'rt-reset rt-BaseButton rt-r-size-2 rt-variant-outline rt-Button'),
      Scene.expect(Scene.selector('p')).not.toExist(),
    )
  })
})
