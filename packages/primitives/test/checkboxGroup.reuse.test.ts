import { Schema } from 'effect'
import { createLazy } from 'foldkit/html'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { expect, it, vi } from 'vitest'
import { view } from '../src/checkbox-group.js'

const Message = Schema.Literals(['Tick', 'Change'])
type Message = typeof Message.Type
type Model = { tick: number; changed: boolean }
const update = (model: Model, message: Message) => ({ model: message === 'Tick' ? { ...model, tick: model.tick + 1 } : { ...model, changed: !model.changed } })

it('unrelated update reuses view; changed arg re-executes once', () => {
  const empty = new Set<'a'>()
  const selected = new Set<'a'>(['a'])
  const calls = vi.fn((selection: ReadonlySet<'a'>, h: HtmlBuilder<Message>) => view<'a', Message>({
    id: 'reuse', label: h.span([], ['Reuse']), options: [{ value: 'a', label: h.span([], ['A']), isDisabled: false }], selected: selection,
    toggleMessage: () => 'Tick',
  }, h))
  const lazy = createLazy()
  const render = (model: Model, h: HtmlBuilder<Message>) => h.div([], [
    lazy(calls, [model.changed ? selected : empty, h]),
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
