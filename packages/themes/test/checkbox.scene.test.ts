import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { Schema } from 'effect'
import { describe, expect, it } from 'vitest'
import * as Checkbox from '../src/components/checkbox.js'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, message: Message) => ({ model, outMessage: message })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) =>
  Checkbox.view({ id: 'terms', name: 'terms', value: 'yes', checked: false, indeterminate: true, onCheckedChange: () => Message.Tick() }, ['Accept terms'], h)

describe('Checkbox', () => {
  it('renders controlled and mixed state', () => {
    Scene.scene(
      { update, view },
      Scene.given({}),
      Scene.expect(Scene.role('checkbox', { name: 'Accept terms' })).toHaveAttr('aria-checked', 'mixed'),
    )
  })
  it('dispatches the required callback message when toggled', () => {
    Scene.scene(
      { update, view },
      Scene.given({}),
      Scene.click('label'),
      Scene.expectOutMessage(Message.Tick()),
    )
  })
  it('requires the callback demanded by the pinned Foldkit checkbox API', () => {
    expect(() => Schema.decodeUnknownSync(Checkbox.Props)({ id: 'terms' })).toThrow()
  })
})
