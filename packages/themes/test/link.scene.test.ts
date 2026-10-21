import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as Link from '../src/components/link.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => Link.view({ href: '/docs' }, ['Documentation'], h)
describe('themed Link', () => it('renders native link', () => Scene.scene({ update, view }, Scene.given({}), Scene.expect(Scene.role('link', { name: 'Documentation' })).toHaveAttr('href', '/docs'))))
