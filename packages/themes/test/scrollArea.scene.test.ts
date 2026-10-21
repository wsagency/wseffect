import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as ScrollArea from '../src/components/scroll-area.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => ScrollArea.view({ scrollbars: 'vertical' }, ['scroll content'], h)
describe('themed ScrollArea', () => it('scrolls natively', () => Scene.scene({ update, view }, Scene.given({}), Scene.expect(Scene.selector('.rt-ScrollAreaViewport')).toHaveAttr('tabindex', '0'), Scene.expect(Scene.text('scroll content')).toExist())))
