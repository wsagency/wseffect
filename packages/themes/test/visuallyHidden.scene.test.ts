import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as VisuallyHidden from '../src/components/visually-hidden.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => VisuallyHidden.view({}, ['Help text'], h)
describe('themed VisuallyHidden', () => {
  it('hides visually but remains exposed', () => Scene.scene({ update, view }, Scene.given({}),
    Scene.expect(Scene.text('Help text')).toExist(),
    Scene.expect(Scene.selector('.rt-VisuallyHidden')).toExist()))
})
