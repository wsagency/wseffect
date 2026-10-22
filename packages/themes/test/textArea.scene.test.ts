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
  it('forwards native attributes to the textarea', () => Scene.scene(
    { update, view: (_model, h) => TextArea.view({
      id: 'notes',
      label: 'Notes',
      value: '',
      name: 'notes',
      required: true,
      rows: 5,
      placeholder: 'Write notes',
      textareaAttributes: [h.Attribute('aria-describedby', 'notes-help'), h.AriaLabel('Notes input')],
    }, [], h) },
    Scene.given({ value: '' }),
    Scene.expect(Scene.selector('textarea')).toHaveAttr('name', 'notes'),
    Scene.expect(Scene.selector('textarea[required]')).toExist(),
    Scene.expect(Scene.selector('textarea')).toHaveAttr('rows', '5'),
    Scene.expect(Scene.selector('textarea')).toHaveAttr('placeholder', 'Write notes'),
    Scene.expect(Scene.selector('textarea')).toHaveAttr('aria-describedby', 'notes-help'),
    Scene.expect(Scene.selector('textarea')).toHaveAttr('aria-label', 'Notes input'),
  ))
  it('does not require a label when the textarea has its own accessible name', () => Scene.scene(
    { update, view: (_model, h) => TextArea.view({
      id: 'notes',
      value: '',
      textareaAttributes: [h.AriaLabel('Notes input')],
    }, [], h) },
    Scene.given({ value: '' }),
    Scene.expect(Scene.selector('label')).not.toExist(),
    Scene.expect(Scene.role('textbox', { name: 'Notes input' })).toExist(),
  ))

})
