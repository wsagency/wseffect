import { Schema } from 'effect'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { it } from 'vitest'
import { view } from '../src/checkbox-group.js'

const Message = Schema.Struct({ value: Schema.Literals(['alpha', 'beta']), checked: Schema.Boolean })
type Message = typeof Message.Type
type Model = { selected: ReadonlySet<'alpha' | 'beta'>; messages: ReadonlyArray<Message> }
const update = (model: Model, message: Message) => ({ model: { ...model, messages: [...model.messages, message] } })
const render = (model: Model, h: HtmlBuilder<Message>) => h.div([], [
  view({
    id: 'choices',
    label: h.span([], ['Choices']),
    options: [
      { value: 'alpha', label: h.span([], ['Alpha']), isDisabled: false },
      { value: 'beta', label: h.span([], ['Beta']), isDisabled: true },
    ],
    selected: model.selected,
    toggleMessage: (value, checked) => ({ value, checked }),
  }, h),
  h.span([], model.messages.map(({ value, checked }) => `${value} ${checked}`)),
])

it('emits typed toggle without owning selected values', () => {
  Scene.scene(
    { update, view: render },
    Scene.given({ selected: new Set(['alpha']), messages: [] }),
    Scene.change(Scene.role('checkbox'), ''),
    Scene.expect(Scene.text('alpha false')).toExist(),
    Scene.expect(Scene.role('checkbox')).toHaveAttr('aria-checked', 'true'),
  )
})
