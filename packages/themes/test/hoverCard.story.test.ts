import * as Option from 'effect/Option'
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
  it('folds a child message into its parent model', () => {
    type ParentModel = { hoverCard: HoverCard.Model }
    type ParentMessage = { _tag: 'HoverCard'; message: HoverCard.Message }
    const fold = HoverCard.fold<ParentModel, ParentMessage, never>({
      read: model => Option.some(model.hoverCard),
      write: (model, hoverCard) => ({ ...model, hoverCard }),
      toParentMessage: message => ({ _tag: 'HoverCard', message }),
      foldOutMessage: () => model => ({ model }),
    })
    const result = fold(
      { hoverCard: HoverCard.init() },
      HoverIntent.Message.FocusedTrigger(),
    )
    expect(result.model.hoverCard.isOpen).toBe(true)
  })
})
