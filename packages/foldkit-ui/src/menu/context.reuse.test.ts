import { Schema } from 'effect'
import { createLazy } from '@wsagency/wseffect-foldkit/html'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { expect, it, vi } from 'vitest'
import * as Menu from './index.js'
import { createContextMenu, type ContextMenuConfig } from './context.js'

const bundle = createContextMenu<'open'>()
const config: ContextMenuConfig<'open'> = {
  id: 'reuse', sourceId: 'source', sourceToken: 'token',
  items: [{ value: 'open', textValue: 'Open', isDisabled: false, content: null }],
}
const initial = bundle.init(config)
const Message = Schema.Union([Schema.Literals(['Tick', 'Change']), Menu.Message])
type Message = typeof Message.Type
type Model = Readonly<{ tick: number; changed: boolean }>
const update = (model: Model, message: Message) => ({
  model: message === 'Tick'
    ? { ...model, tick: model.tick + 1 }
    : message === 'Change' ? { ...model, changed: !model.changed } : model,
})

it('reuses unrelated views and re-executes only after a memo argument changes', () => {
  const calls = vi.fn((input: ContextMenuConfig<'open'>, model: Menu.Model, h: HtmlBuilder<Menu.Message>) =>
    bundle.view(model, input, h))
  const lazy = createLazy()
  const render = (model: Model, h: HtmlBuilder<Message>) => h.div([], [
    lazy(calls, [model.changed ? { ...config, sourceToken: 'replacement' } : config, initial, h as unknown as HtmlBuilder<Menu.Message>]),
    h.button([h.OnClick('Tick')], ['unrelated']),
    h.button([h.OnClick('Change')], ['change']),
  ])
  Scene.scene(
    { update, view: render },
    Scene.given({ tick: 0, changed: false }),
    Scene.Mount.resolve({ name: 'ContextMenuSourceEvents' }, Menu.Message.IgnoredMouseClick()),
    Scene.click(Scene.role('button', { name: 'unrelated' })),
    Scene.click(Scene.role('button', { name: 'change' })),
  )
  expect(calls).toHaveBeenCalledTimes(2)
})
