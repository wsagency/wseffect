import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as ScrollArea from '../src/components/scroll-area.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => ScrollArea.view({ scrollbars: 'vertical' }, ['scroll content'], h)
describe('themed ScrollArea', () => it('matches native scroll structure and classes', () => Scene.scene({ update, view }, Scene.given({}), Scene.expect(Scene.selector('.rt-ScrollAreaRoot')).toHaveClass('rt-r-size-1'), Scene.expect(Scene.selector('.rt-ScrollAreaViewport')).toHaveAttr('tabindex', '0'), Scene.expect(Scene.selector('.rt-ScrollAreaViewport')).toHaveStyle('overflow-y', 'auto'), Scene.expect(Scene.selector('.rt-ScrollAreaViewport')).toHaveStyle('overflow-x', 'hidden'), Scene.expect(Scene.selector('.rt-ScrollAreaViewportFocusRing')).toExist(), Scene.expect(Scene.selector('.rt-ScrollAreaScrollbar')).not.toExist(), Scene.expect(Scene.text('scroll content')).toExist())))
