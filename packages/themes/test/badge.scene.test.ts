import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as Badge from '../src/components/badge.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => Badge.view({ role: 'status' }, ['Online'], h)
describe('themed Badge', () => it('uses native status content', () => Scene.scene({ update, view }, Scene.given({}), Scene.expect(Scene.selector('span[role="status"].rt-Badge')).toExist(), Scene.expect(Scene.text('Online')).toExist())))
