import { createLazy, type HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, expect, it, vi } from 'vitest'
import * as Popover from '../src/components/popover.js'

const Message = defineMessageUnion({ Tick: {}, Rename: {} })
type Message = typeof Message.Type
type ParentModel = { label: string; tick: number }
const update = (model: ParentModel, message: Message) => ({ model: message._tag === 'Rename' ? { ...model, label: 'Grace Hopper' } : { ...model, tick: model.tick + 1 } })
const lazy = createLazy()
const renderPopover = vi.fn((label: string, h: HtmlBuilder<Message>) => Popover.embed(h, {
  slotId: 'popover', model: Popover.init({ id: 'person' }), toParentMessage: () => Message.Tick(),
  viewInputs: { trigger: [label], content: ['Computer scientist'] },
}))
const view = (model: ParentModel, h: HtmlBuilder<Message>) => h.div([], [
  lazy(renderPopover, [model.label, h]),
  h.button([h.OnClick(Message.Tick())], ['Unrelated update']),
  h.button([h.OnClick(Message.Rename())], ['Change trigger label']),
])

describe('Popover execution-counter reuse', () => {
  it('unrelated update executes 0 views; one changed memo argument executes exactly 1 affected view', () => {
    renderPopover.mockClear()
    Scene.scene(
      { update, view }, Scene.given({ label: 'Ada Lovelace', tick: 0 }),
      Scene.expect(Scene.role('button', { name: 'Ada Lovelace' })).toExist(),
      Scene.click(Scene.role('button', { name: 'Unrelated update' })),
      Scene.expect(Scene.role('button', { name: 'Ada Lovelace' })).toExist(),
      Scene.click(Scene.role('button', { name: 'Change trigger label' })),
      Scene.expect(Scene.role('button', { name: 'Grace Hopper' })).toExist(),
    )
    expect(renderPopover).toHaveBeenCalledTimes(2)
  })
})
