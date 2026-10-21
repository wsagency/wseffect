import { Option, Schema } from 'effect'
import { createLazy } from 'foldkit/html'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { expect, it, vi } from 'vitest'
import * as Select from '../src/select.js'

const select = Select.createSelect<'one'>()
const base: Select.SelectConfig<'one'> = {
  id: 'reuse-select', selectedValue: Option.none(), position: 'item-aligned', isModal: false,
  items: [{ value: 'one', textValue: 'One', isDisabled: false, content: null }],
}
const Message = Schema.Literals(['Tick', 'Change'])
const selectModel = select.init(base)
type Message = typeof Message.Type
type Model = { tick: number; changed: boolean }
const update = (model: Model, message: Message) => ({ model: message === 'Tick' ? { ...model, tick: model.tick + 1 } : { ...model, changed: !model.changed } })

it('unrelated update reuses view; changed arg re-executes once', () => {
  const calls = vi.fn((config: Select.SelectConfig<'one'>, model: Select.SelectModel, h: HtmlBuilder<Select.SelectMessage>) => select.view(model, config, h))
  const lazy = createLazy()
  const render = (model: Model, h: HtmlBuilder<Message>) => h.div([], [
    lazy(calls, [model.changed ? { ...base, selectedValue: Option.some<'one'>('one') } : base, selectModel, h as unknown as HtmlBuilder<Select.SelectMessage>]),
    h.button([h.OnClick('Tick')], ['unrelated']),
    h.button([h.OnClick('Change')], ['change']),
  ])
  Scene.scene(
    { update, view: render },
    Scene.given({ tick: 0, changed: false }),
    Scene.click(Scene.role('button', { name: 'unrelated' })),
    Scene.click(Scene.role('button', { name: 'change' })),
  )
  expect(calls).toHaveBeenCalledTimes(2)
})
