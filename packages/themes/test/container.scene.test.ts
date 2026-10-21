import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as Container from '../src/components/container.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => Container.view({ size: { initial: '1', md: '3' } }, ['content'], h)
describe('themed Container', () => it('keeps responsive size', () => Scene.scene({ update, view }, Scene.given({}), Scene.expect(Scene.selector('.rt-Container')).toHaveAttr('class', 'rt-Container rt-r-size-1 md:rt-r-size-3'))))
