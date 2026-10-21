import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as Inset from '../src/components/inset.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => Inset.view({ side: 'x', p: 'current' }, ['content'], h)
describe('themed Inset', () => it('maps inset props', () => Scene.scene({ update, view }, Scene.given({}), Scene.expect(Scene.selector('.rt-Inset')).toHaveAttr('class', 'rt-Inset rt-r-side-x rt-r-clip-border-box rt-r-p-current'))))
