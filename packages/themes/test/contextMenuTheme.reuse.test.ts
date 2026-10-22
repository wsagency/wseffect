import type { HtmlBuilder } from 'foldkit/html'
import { createLazy } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import * as Menu from '@foldkit/ui/menu'
import { describe, expect, it, vi } from 'vitest'
import * as ContextMenu from '../src/components/context-menu.js'

const contextMenu = ContextMenu.create<'edit'>()
const Message = defineMessageUnion({ Tick: {}, Rename: {} })
type Message = typeof Message.Type
type ParentModel = { label: string; tick: number }
const update = (model: ParentModel, message: Message) => ({ model: message._tag === 'Rename' ? { ...model, label: 'Rename action' } : { ...model, tick: model.tick + 1 } })
const lazy = createLazy()
const renderMenu = vi.fn((label: string, h: HtmlBuilder<Message>) => {
  const config: ContextMenu.Config<'edit'> = {
    id: 'actions', sourceId: 'source', sourceToken: 'live-source-token', longPressMs: 600,
    items: [{ value: 'edit', textValue: label, isDisabled: false, content: h.span([], [label]) }],
    toItem: () => null,
  }
  return contextMenu.embed(h, { slotId: 'context-menu', model: contextMenu.init(config), config, toParentMessage: () => Message.Tick() })
})
const view = (model: ParentModel, h: HtmlBuilder<Message>) => h.div([], [
  lazy(renderMenu, [model.label, h]),
  h.button([h.OnClick(Message.Tick())], ['Unrelated update']),
  h.button([h.OnClick(Message.Rename())], ['Change item label']),
])

describe('ContextMenu execution-counter reuse', () => {
  it('unrelated update executes 0 views; one changed memo argument executes exactly 1 affected view', () => {
    renderMenu.mockClear()
    Scene.scene(
      { update, view }, Scene.given({ label: 'Edit action', tick: 0 }),
      Scene.Mount.resolve({ name: 'ContextMenuSourceEvents' }, Menu.Message.IgnoredMouseClick()),
      Scene.click(Scene.role('button', { name: 'Unrelated update' })),
      Scene.expect(Scene.text('actions')).toExist(),
      Scene.click(Scene.role('button', { name: 'Change item label' })),
      Scene.expect(Scene.text('actions')).toExist(),
    )
    expect(renderMenu).toHaveBeenCalledTimes(2)
  })
})
