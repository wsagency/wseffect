import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as Section from '../src/components/section.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => Section.view({ size: '2' }, ['content'], h)
describe('themed Section', () => it('uses section structure', () => Scene.scene({ update, view }, Scene.given({}), Scene.expect(Scene.selector('section.rt-Section')).toExist())))
