import { Schema } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as CheckboxGroup from '../src/components/checkbox-group.js'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({ Toggled: { value: Schema.String, isChecked: Schema.Boolean } })
type Message = typeof Message.Type
const update = (model: Readonly<{ toggles: number }>, message: Message) => ({ model: { toggles: model.toggles + Number(message._tag === 'Toggled') } })
const view = (model: Readonly<{ toggles: number }>, h: HtmlBuilder<Message>) => h.div([], [
  CheckboxGroup.view({ id: 'topics', label: 'Topics', options: [{ value: 'news', label: 'News', isDisabled: false }], selected: new Set(), toggleMessage: (value, isChecked) => Message.Toggled({ value, isChecked }) }, h),
  h.span([], [`Toggles: ${model.toggles}`]),
])

describe('CheckboxGroup', () => {
  it('renders a labelled group and typed toggle', () => {
    Scene.scene(
      { update, view },
      Scene.given({ toggles: 0 }),
      Scene.expect(Scene.role('group', { name: 'Topics' })).toExist(),
      Scene.change(Scene.selector('input[type="checkbox"]'), ''),
      Scene.expect(Scene.selector('input[type="checkbox"]')).toHaveAttr('aria-checked', 'false'),
      Scene.expect(Scene.text('Toggles: 1')).toExist(),
    )
  })
})
