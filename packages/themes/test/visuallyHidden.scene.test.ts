import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, it } from 'vitest'
import * as VisuallyHidden from '../src/components/visually-hidden.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => VisuallyHidden.view({}, ['Help text'], h)
describe('themed VisuallyHidden', () => {
  it('hides visually but remains exposed', () => Scene.scene({ update, view }, Scene.given({}),
    Scene.expect(Scene.text('Help text')).toExist(),
    Scene.expect(Scene.selector('span')).toHaveStyle('position', 'absolute'),
    Scene.expect(Scene.selector('span')).toHaveStyle('clip', 'rect(0, 0, 0, 0)')))
})
