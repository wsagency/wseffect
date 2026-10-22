import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as ScrollArea from '../src/components/scroll-area.js'
import { mountScrollArea } from '../src/components/scroll-area.mount.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => ScrollArea.view({ size: '2', radius: 'full', scrollbars: 'vertical', m: '2' }, ['scroll content'], h)
describe('themed ScrollArea', () => it('wires size, radius, and scrollbars to the pinned structure', () => Scene.scene(
  { update, view }, Scene.given({}),
  Scene.Mount.resolve(mountScrollArea<Message>(), Message.Tick()),
  Scene.expect(Scene.selector('.rt-ScrollAreaRoot')).toHaveAttr('class', 'rt-ScrollAreaRoot rt-r-m-2'),
  Scene.expect(Scene.selector('.rt-ScrollAreaViewport')).toHaveAttr('tabindex', '0'),
  Scene.expect(Scene.selector('.rt-ScrollAreaViewport')).toHaveStyle('overflow-y', 'auto'),
  Scene.expect(Scene.selector('.rt-ScrollAreaViewport')).toHaveStyle('overflow-x', 'auto'),
  Scene.expect(Scene.selector('.rt-ScrollAreaViewportFocusRing')).toExist(),
  Scene.expect(Scene.selector('.rt-ScrollAreaScrollbar')).toHaveAttr('class', 'rt-ScrollAreaScrollbar rt-r-size-2'),
  Scene.expect(Scene.selector('.rt-ScrollAreaScrollbar')).toHaveAttr('data-orientation', 'vertical'),
  Scene.expect(Scene.selector('.rt-ScrollAreaScrollbar')).toHaveAttr('data-radius', 'full'),
  Scene.expect(Scene.selector('.rt-ScrollAreaScrollbar[data-orientation="horizontal"]')).not.toExist(),
  Scene.expect(Scene.selector('.rt-ScrollAreaCorner')).not.toExist(),
  Scene.expect(Scene.text('scroll content')).toExist(),
)))
it('wraps viewport children in the pinned content element', () => Scene.scene(
  { update, view: (_model, h) => ScrollArea.view({}, ['content'], h) },
  Scene.given({}),
  Scene.Mount.resolve(mountScrollArea<Message>(), Message.Tick()),
  Scene.expect(Scene.selector('.rt-ScrollAreaViewport [data-radix-scroll-area-content]')).toExist(),
  Scene.expect(Scene.selector('[data-radix-scroll-area-content]')).toHaveStyle('min-width', '100%'),
  Scene.expect(Scene.selector('[data-radix-scroll-area-content]')).toHaveStyle('display', 'table'),
))
