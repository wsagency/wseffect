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
  viewInputs: { trigger: ['Save'], content: ['Save changes'] },
})

describe('themed Tooltip', () => {
  it('remains a nonfocusable tooltip description', () => {
    const tooltip = UiTooltip.update(Tooltip.init({ id: 'save' }), UiTooltip.Message.FocusedTrigger()).model
    Scene.scene(
      { update, view }, Scene.given({ tooltip }),
      Scene.Mount.resolve(UiTooltip.AnchorTooltip, UiTooltip.Message.CompletedAnchorTooltip()),
      Scene.expect(Scene.role('tooltip')).toExist(),
      Scene.expect(Scene.text('Save changes')).toExist(),
      Scene.expect(Scene.selector('[role="tooltip"]')).not.toHaveAttr('tabindex'),
    )
  })
})
