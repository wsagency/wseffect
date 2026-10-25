import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, it } from 'vitest'
import * as Radio from '../src/components/radio.js'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => Radio.view({ id: 'free', value: 'free', checked: true }, ['Free'], h)
describe('Radio', () => {
  it('uses radio item attributes', () => Scene.scene({ update, view }, Scene.given({}), Scene.expect(Scene.selector('[role="radio"]')).toExist(), Scene.expect(Scene.text('Free')).toExist()))
})
