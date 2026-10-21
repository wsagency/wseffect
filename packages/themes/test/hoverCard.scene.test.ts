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
  viewInputs: { id: 'person', trigger: ['Ada Lovelace'], content: [h.p([], ['Mathematician'])] },
})

describe('themed HoverCard', () => {
  it('opens nonmodal description content from an accessible trigger', () => {
    const hover = { ...HoverCard.init(), isOpen: true }
    Scene.scene(
      { update, view }, Scene.given({ hover }),
      Scene.Mount.resolve({ name: 'AnchorHoverCard' }, HoverCard.Message.CompletedWaitBeforeClosing({ version: -1 })),
      Scene.expect(Scene.role('button', { name: 'Ada Lovelace' })).toExist(),
      Scene.expect(Scene.selector('.rt-HoverCardContent')).toExist(),
      Scene.expect(Scene.text('Mathematician')).toExist(),
    )
  })
})
