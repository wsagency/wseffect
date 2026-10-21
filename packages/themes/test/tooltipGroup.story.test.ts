import { Duration } from 'effect'
import * as TooltipGroup from '@wsagency/wseffect-primitives/tooltip-group'
import * as UiTooltip from '@foldkit/ui/tooltip'
import { describe, expect, it } from 'vitest'
import * as Tooltip from '../src/components/tooltip.js'

describe('themed TooltipGroup coordination', () => {
  it('reflects group skip delay while focused tooltip opens immediately', () => {
    const group = TooltipGroup.update(TooltipGroup.init(), { _tag: 'TooltipOpened', now: 0 }).model
    const initial = Tooltip.init({ id: 'first' })
    const nextModel = Tooltip.reflectShowDelay(initial, group)
    expect(Duration.toMillis(nextModel.showDelay)).toBe(0)
    const focused = UiTooltip.update(nextModel, UiTooltip.Message.FocusedTrigger())
    expect(focused.model.isOpen).toBe(true)
  })
})
