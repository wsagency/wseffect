import * as Duration from 'effect/Duration'
import * as HoverIntent from '@foldkit/ui/hoverIntent'
import { describe, expect, it } from 'vitest'
import * as HoverCard from '../src/components/hover-card.js'

describe('HoverCard wrapper', () => {
  it('opens from pointer and focus with configured delays', () => {
    const model = HoverCard.init({ openDelay: 200, closeDelay: 300 })
    expect(Duration.toMillis(model.openDelay)).toBe(200)
    expect(Duration.toMillis(model.closeDelay)).toBe(300)
    const opened = HoverIntent.update(model, HoverIntent.Message.FocusedTrigger())
    expect(opened.model.isOpen).toBe(true)
  })
})
