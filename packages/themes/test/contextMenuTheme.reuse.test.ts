import * as Option from 'effect/Option'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { createLazy } from '@wsagency/wseffect-foldkit/html'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import * as Menu from '@wsagency/wseffect-foldkit-ui/menu'
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
    items: [{
      id: 'main-actions',
      label: h.span([], ['Main actions']),
      items: [{ value: 'edit', textValue: label, isDisabled: false, content: h.span([], [label]) }],
    }],
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
  it('constructs a parent fold for its child messages', () => {
    const ParentMessage = defineMessageUnion({ Menu: { message: contextMenu.Message } })
    type ParentMessage = typeof ParentMessage.Type
    type ParentModel = { menu: ContextMenu.Model }
    const fold = contextMenu.fold<ParentModel, ParentMessage, never>({
      read: model => Option.some(model.menu),
      write: (model, menu) => ({ ...model, menu }),
      toParentMessage: message => ParentMessage.Menu({ message }),
      foldOutMessage: () => model => ({ model }),
    })
    expect(fold).toBeTypeOf('function')
  })
})
