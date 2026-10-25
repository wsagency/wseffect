import { Schema } from 'effect'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, it } from '@effect/vitest'
import { view } from './index.js'

const Message = Schema.Struct({ value: Schema.Literals(['alpha', 'beta']), isChecked: Schema.Boolean })
type Message = typeof Message.Type
type Model = Readonly<{ selected: ReadonlySet<'alpha' | 'beta'>; messages: ReadonlyArray<Message> }>
const update = (model: Model, message: Message) => ({
  model: {
    ...model,
    messages: [...model.messages, message],
  },
})

const render = (model: Model, h: HtmlBuilder<Message>) => h.div([], [
  view({
    id: 'choices',
    label: h.span([], ['Choices']),
    options: [
      { value: 'alpha', label: h.span([], ['Alpha']) },
      { value: 'beta', label: h.span([], ['Beta']), isDisabled: true },
    ],
    selected: model.selected,
    toggleMessage: (value, isChecked) => ({ value, isChecked }),
    toView: ({ rootAttributes, labelAttributes, options }) => h.div(rootAttributes, [
      h.span(labelAttributes, ['Choices']),
      ...options.map(({ option, checkbox }) => h.div([...checkbox.checkbox], [option.label])),
    ]),
  }, h),
  h.span([], model.messages.map(({ value, isChecked }) => `${value} ${isChecked}`)),
])

describe('CheckboxGroup controlled values', () => {
  it('emits the requested next value without changing selection itself', () => {
    Scene.scene(
      { update, view: render },
      Scene.given({ selected: new Set(['alpha']), messages: [] }),
      Scene.click(Scene.role('checkbox', { name: 'Alpha' })),
      Scene.expect(Scene.text('alpha false')).toExist(),
      Scene.expect(Scene.role('checkbox', { name: 'Alpha' })).toHaveAttr('aria-checked', 'true'),
    )
  })
})
