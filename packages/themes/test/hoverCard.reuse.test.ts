import { createLazy, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { describe, expect, it, vi } from 'vitest'
import * as HoverCard from '../src/components/hover-card.js'

const Message = defineMessageUnion({ Tick: {}, Rename: {} })
type Message = typeof Message.Type
type ParentModel = { label: string; tick: number }
const update = (model: ParentModel, message: Message) => ({ model: message._tag === 'Rename' ? { ...model, label: 'Grace Hopper' } : { ...model, tick: model.tick + 1 } })
const lazy = createLazy()
const renderHoverCard = vi.fn((label: string, h: HtmlBuilder<Message>) => HoverCard.embed(h, {
  slotId: 'hover-card', id: 'person', model: HoverCard.init(), toParentMessage: () => Message.Tick(),
  viewInputs: { id: 'person', trigger: [label], content: ['Computer scientist'] },
}))
const view = (model: ParentModel, h: HtmlBuilder<Message>) => h.div([], [
  lazy(renderHoverCard, [model.label, h]),
  h.button([h.OnClick(Message.Tick())], ['Unrelated update']),
  h.button([h.OnClick(Message.Rename())], ['Change trigger label']),
])

describe('HoverCard execution-counter reuse', () => {
  it('unrelated update executes 0 views; one changed memo argument executes exactly 1 affected view', () => {
    renderHoverCard.mockClear()
    Scene.scene(
      { update, view }, Scene.given({ label: 'Ada Lovelace', tick: 0 }),
      Scene.expect(Scene.role('button', { name: 'Ada Lovelace' })).toExist(),
      Scene.click(Scene.role('button', { name: 'Unrelated update' })),
      Scene.expect(Scene.role('button', { name: 'Ada Lovelace' })).toExist(),
      Scene.click(Scene.role('button', { name: 'Change trigger label' })),
      Scene.expect(Scene.role('button', { name: 'Grace Hopper' })).toExist(),
    )
    expect(renderHoverCard).toHaveBeenCalledTimes(2)
  })
})
