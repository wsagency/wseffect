import { Schema, Stream } from 'effect'
import * as Menu from '@foldkit/ui/menu'
import { createLazy } from 'foldkit/html'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { expect, it, vi } from 'vitest'
import * as ContextMenu from '../src/context-menu.js'

const bundle = ContextMenu.createContextMenu<'open'>()
const config: ContextMenu.ContextMenuConfig<'open'> = {
  id: 'reuse', sourceId: 'source', sourceToken: 'token', longPressMs: 600,
  items: [{ value: 'open', textValue: 'Open', isDisabled: false, content: null }], toItem: () => null,
}
const initial = bundle.init(config)
const Message = Schema.Union([Schema.Literals(['Tick', 'Change']), ContextMenu.ContextMenuMessageSchema])
type Message = typeof Message.Type
type Model = { tick: number; changed: boolean }
const update = (model: Model, message: Message) => ({
  model: message === 'Tick' ? { ...model, tick: model.tick + 1 } : message === 'Change' ? { ...model, changed: !model.changed } : model,
})

const sourceMount = { name: 'ContextMenuSourceEvents', f: () => Stream.empty }
it('unrelated update reuses view; changed arg re-executes once', () => {
  const calls = vi.fn((input: ContextMenu.ContextMenuConfig<'open'>, model: ContextMenu.ContextMenuModel, h: HtmlBuilder<ContextMenu.ContextMenuMessage>) => bundle.view(model, input, h))
  const lazy = createLazy()
  const render = (model: Model, h: HtmlBuilder<Message>) => h.div([], [
    lazy(calls, [model.changed ? { ...config, sourceToken: 'replacement' } : config, initial, h as unknown as HtmlBuilder<ContextMenu.ContextMenuMessage>]),
    h.button([h.OnClick('Tick')], ['unrelated']),
    h.button([h.OnClick('Change')], ['change']),
  ])
  Scene.scene(
    { update, view: render },
    Scene.given({ tick: 0, changed: false }),
    Scene.Mount.resolve(sourceMount, Menu.Message.IgnoredMouseClick()),
    Scene.click(Scene.role('button', { name: 'unrelated' })),
    Scene.click(Scene.role('button', { name: 'change' })),
  )
  expect(calls).toHaveBeenCalledTimes(2)
})
