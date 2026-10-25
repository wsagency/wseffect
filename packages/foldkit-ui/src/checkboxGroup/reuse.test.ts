import { createLazy } from '@wsagency/wseffect-foldkit/html'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { expect, it, vi } from '@effect/vitest'
import { view } from './index.js'

type Message = 'Tick' | 'Change'
type Model = Readonly<{ tick: number; changed: boolean }>
const update = (model: Model, message: Message) => ({
  model: message === 'Tick' ? { ...model, tick: model.tick + 1 } : { ...model, changed: !model.changed },
})

it('reuses unrelated views and recomputes when the selected-set argument changes', () => {
  const empty = new Set<'a'>()
  const selected = new Set<'a'>(['a'])
  const calls = vi.fn((selection: ReadonlySet<'a'>, h: HtmlBuilder<Message>) => view<'a', Message>({
    id: 'reuse',
    label: h.span([], ['Reuse']),
    options: [{ value: 'a', label: h.span([], ['A']) }],
    selected: selection,
    toggleMessage: () => 'Tick',
    toView: ({ rootAttributes, labelAttributes, options }) => h.div(rootAttributes, [
      h.span(labelAttributes, ['Reuse']),
      ...options.map(({ option, checkbox }) => h.div([...checkbox.checkbox], [option.label])),
    ]),
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
