import { Schema } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { defineMessageUnion } from 'foldkit/message'
import { describe, it } from 'vitest'
import * as TextArea from '../src/components/text-area.js'
const Message = defineMessageUnion({ Changed: { value: Schema.String } })
type Message = typeof Message.Type
const update = (model: Readonly<{ value: string }>, message: Message) => ({ model: { value: message.value } })
const view = (model: Readonly<{ value: string }>, h: HtmlBuilder<Message>) => TextArea.view({ id: 'notes', label: 'Notes', value: model.value, onInput: value => Message.Changed({ value }) }, [], h)
describe('TextArea', () => {
  it('uses textbox role and controlled value', () => Scene.scene({ update, view }, Scene.given({ value: 'hello' }), Scene.expect(Scene.role('textbox', { name: 'Notes' })).toHaveAttr('value', 'hello')))
})
