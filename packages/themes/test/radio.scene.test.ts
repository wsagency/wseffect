import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as Radio from '../src/components/radio.js'
import { defineMessageUnion } from 'foldkit/message'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => Radio.view({ id: 'free', value: 'free', checked: true }, ['Free'], h)
describe('Radio', () => {
  it('uses radio item attributes', () => Scene.scene({ update, view }, Scene.given({}), Scene.expect(Scene.selector('[role="radio"]')).toExist(), Scene.expect(Scene.text('Free')).toExist()))
})
