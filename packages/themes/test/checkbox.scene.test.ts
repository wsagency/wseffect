import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as Checkbox from '../src/components/checkbox.js'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) =>
  Checkbox.view({ id: 'terms', name: 'terms', value: 'yes', checked: false, indeterminate: true }, ['Accept terms'], h)

describe('Checkbox', () => {
  it('renders controlled and mixed state', () => {
    Scene.scene(
      { update, view },
      Scene.given({}),
      Scene.expect(Scene.role('checkbox', { name: 'Accept terms' })).toHaveAttr('aria-checked', 'mixed'),
    )
  })
})
