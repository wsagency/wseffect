import * as Option from 'effect/Option'
import { createLazy, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { describe, expect, it, vi } from 'vitest'
import * as Tooltip from '../src/components/tooltip.js'

const Message = defineMessageUnion({ Tick: {}, Rename: {} })
type Message = typeof Message.Type
type Model = { label: string; tick: number }
const update = (model: Model, message: Message) => ({ model: message._tag === 'Rename' ? { ...model, label: 'Save in progress' } : { ...model, tick: model.tick + 1 } })
const lazy = createLazy()
const renderTooltip = vi.fn((label: string, h: HtmlBuilder<Message>) => Tooltip.embed(h, {
  slotId: 'tooltip', model: Tooltip.init({ id: 'save' }), toParentMessage: () => Message.Tick(),
  viewInputs: { trigger: [label], content: ['Tooltip description'] },
}))
const view = (model: Model, h: HtmlBuilder<Message>) => h.div([], [
  lazy(renderTooltip, [model.label, h]),
  h.button([h.OnClick(Message.Tick())], ['Unrelated update']),
  h.button([h.OnClick(Message.Rename())], ['Change description']),
])

describe('Tooltip execution-counter reuse', () => {
  it('unrelated update executes 0 views; one changed memo argument executes exactly 1 affected view', () => {
    renderTooltip.mockClear()
    Scene.scene(
      { update, view }, Scene.given({ label: 'Save changes', tick: 0 }),
      Scene.expect(Scene.role('button', { name: 'Save changes' })).toExist(),
      Scene.click(Scene.role('button', { name: 'Unrelated update' })),
      Scene.expect(Scene.role('button', { name: 'Save changes' })).toExist(),
      Scene.click(Scene.role('button', { name: 'Change description' })),
      Scene.expect(Scene.role('button', { name: 'Save in progress' })).toExist(),
    )
    expect(renderTooltip).toHaveBeenCalledTimes(2)
  })
  it('folds a focused child message into the parent model', () => {
    const ParentMessage = defineMessageUnion({ Tooltip: { message: Tooltip.Message } })
    type ParentMessage = typeof ParentMessage.Type
    type ParentModel = { tooltip: Tooltip.Model }
    const fold = Tooltip.fold<ParentModel, ParentMessage, never>({
      read: model => Option.some(model.tooltip),
      write: (model, tooltip) => ({ ...model, tooltip }),
      toParentMessage: message => ParentMessage.Tooltip({ message }),
      foldOutMessage: () => model => ({ model }),
    })
    const result = fold(
      { tooltip: Tooltip.init({ id: 'folded-tooltip' }) },
      Tooltip.Message.FocusedTrigger(),
    )
    expect(result.model.tooltip.isOpen).toBe(true)
  })
})
