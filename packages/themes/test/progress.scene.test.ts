import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as Progress from '../src/components/progress.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => Progress.view({ value: 40, max: 100 }, [], h)
describe('themed Progress', () => {
  it('exposes progress value', () => Scene.scene({ update, view }, Scene.given({}),
    Scene.expect(Scene.selector('[role="progressbar"]')).toHaveAttr('aria-valuenow', '40')))
  it('uses Foldkit progress state attributes', () => Scene.scene({ update, view }, Scene.given({}),
    Scene.expect(Scene.selector('[role="progressbar"]')).toHaveAttr('data-state', 'loading')))
})
