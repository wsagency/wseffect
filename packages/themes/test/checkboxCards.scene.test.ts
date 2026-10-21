import { Schema } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as CheckboxCards from '../src/components/checkbox-cards.js'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({ Toggled: { value: Schema.String, isChecked: Schema.Boolean } })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) =>
  CheckboxCards.view({ id: 'plans', label: 'Plans', options: [{ value: 'pro', label: 'Pro', isDisabled: false }], selected: new Set(['pro']), toggleMessage: (value, isChecked) => Message.Toggled({ value, isChecked }) }, h)

describe('CheckboxCards', () => {
  it('keeps card selection parent controlled', () => {
    Scene.scene(
      { update, view },
      Scene.given({}),
      Scene.expect(Scene.role('group', { name: 'Plans' })).toExist(),
      Scene.expect(Scene.selector('input[type="checkbox"]')).toHaveAttr('aria-checked', 'true'),
    )
  })
})
