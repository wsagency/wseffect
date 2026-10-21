import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as Separator from '../src/components/separator.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => Separator.view({ decorative: false }, [], h)
describe('themed Separator', () => {
  it('uses separator semantics', () => Scene.scene({ update, view }, Scene.given({}),
    Scene.expect(Scene.selector('[role="separator"]')).toExist()))
})
