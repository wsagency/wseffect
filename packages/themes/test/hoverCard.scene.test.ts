import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as HoverCard from '../src/components/hover-card.js'

const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
type Model = { hover: HoverCard.Model }
const update = (model: Model, _message: Message) => ({ model })
const view = (model: Model, h: HtmlBuilder<Message>) => HoverCard.embed(h, {
  slotId: 'hover-card', id: 'person', model: model.hover, toParentMessage: () => Message.Tick(),
  viewInputs: { id: 'person', triggerHref: '#profile', trigger: ['@radix'], content: ['Radix2Solid profile card.'] },
})

describe('themed HoverCard', () => {
  // Pinned R2S hover-card.tsx:15-23 composes HoverCard.Trigger onto a Link child and emits plain card content.
  it('retains the supplied link trigger and its Radix classes', () => {
    const hover = { ...HoverCard.init(), isOpen: true, isHovered: true }
    Scene.scene(
      { update, view }, Scene.given({ hover }),
      Scene.Mount.expectHas({ name: 'AnchorHoverCard', args: { buttonId: 'person-trigger', anchor: { portal: true, gap: 8 } } }),
      Scene.Mount.resolve({ name: 'AnchorHoverCard' }, HoverCard.Message.CompletedWaitBeforeClosing({ version: -1 })),
      Scene.expect(Scene.role('link', { name: '@radix' })).toExist(),
      Scene.expect(Scene.selector('a')).toHaveAttr('href', '#profile'),
      Scene.expect(Scene.selector('a')).toHaveAttr('class', 'rt-Text rt-reset rt-Link rt-HoverCardTrigger'),
      Scene.expect(Scene.selector('a')).toHaveAttr('data-state', 'open'),
      Scene.expect(Scene.selector('a')).toHaveAttr('data-accent-color', ''),
      Scene.expect(Scene.text('Radix2Solid profile card.')).toExist(),
    )
  })
})
