import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as UiTooltip from '@foldkit/ui/tooltip'
import * as Tooltip from '../src/components/tooltip.js'

const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
type Model = { tooltip: Tooltip.Model }
const update = (model: Model, _message: Message) => ({ model })
const view = (model: Model, h: HtmlBuilder<Message>) => Tooltip.embed(h, {
  slotId: 'tooltip', model: model.tooltip, toParentMessage: () => Message.Tick(),
  viewInputs: { trigger: ['Save'], content: ['Save changes'], anchor: { placement: 'bottom-start' } },
})

describe('themed Tooltip', () => {
  it('preserves the pinned Arrow state and FK Anchor side attributes', () => {
    const tooltip = UiTooltip.update(Tooltip.init({ id: 'save' }), UiTooltip.Message.FocusedTrigger()).model
    Scene.scene(
      { update, view }, Scene.given({ tooltip }),
      Scene.Mount.resolve(UiTooltip.AnchorTooltip, UiTooltip.Message.CompletedAnchorTooltip()),
      Scene.expect(Scene.role('tooltip')).toExist(),
      Scene.expect(Scene.selector('.rt-TooltipArrow')).toExist(),
      Scene.expect(Scene.selector('.rt-TooltipContent span')).toExist(),
      Scene.expect(Scene.selector('[role="tooltip"]')).toHaveAttr('data-state', 'instant-open'),
      Scene.expect(Scene.selector('[role="tooltip"]')).toHaveAttr('data-side', 'bottom'),
    )
  })
  // Pinned R2S tooltip.tsx:16-20 renders a Text size-1 content paragraph and preserves caller Button styling.
  it('matches the pinned trigger button and tooltip text classes', () => {
    const tooltip = UiTooltip.update(Tooltip.init({ id: 'save' }), UiTooltip.Message.FocusedTrigger()).model
    Scene.scene(
      { update, view }, Scene.given({ tooltip }),
      Scene.Mount.resolve(UiTooltip.AnchorTooltip, UiTooltip.Message.CompletedAnchorTooltip()),
      Scene.expect(Scene.selector('button')).toHaveAttr('class', 'rt-reset rt-BaseButton rt-r-size-2 rt-variant-outline rt-Button'),
      Scene.expect(Scene.selector('button')).toHaveAttr('data-accent-color', ''),
      Scene.expect(Scene.selector('.rt-TooltipText')).toHaveAttr('class', 'rt-Text rt-r-size-1 rt-TooltipText'),
    )
  })

})
