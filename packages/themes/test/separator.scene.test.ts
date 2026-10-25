import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
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
it('defaults decorative to true without separator role', () => Scene.scene(
  { update, view: (_model, h) => Separator.view({}, [], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-Separator')).not.toHaveAttr('role', 'separator'),
  Scene.expect(Scene.selector('.rt-Separator')).not.toHaveAttr('aria-orientation', 'horizontal'),
))
it('wires non-default Separator props to R2S classes and attributes', () => Scene.scene(
  { update, view: (_model, h) => Separator.view({ orientation: 'vertical', size: '4', color: 'crimson', decorative: true, m: '2' }, [], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-Separator')).toHaveAttr('class', 'rt-Separator rt-r-orientation-vertical rt-r-size-4 rt-r-m-2'),
  Scene.expect(Scene.selector('.rt-Separator')).not.toHaveAttr('aria-orientation', 'vertical'),
  Scene.expect(Scene.selector('.rt-Separator')).not.toHaveAttr('role', 'separator'),
  Scene.expect(Scene.selector('.rt-Separator')).toHaveAttr('data-accent-color', 'crimson'),
))
it('exposes orientation only for semantic separators', () => Scene.scene(
  { update, view: (_model, h) => Separator.view({ orientation: 'vertical', decorative: false }, [], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-Separator')).toHaveAttr('role', 'separator'),
  Scene.expect(Scene.selector('.rt-Separator')).toHaveAttr('aria-orientation', 'vertical'),
))
it('defaults the accent marker to gray', () => Scene.scene(
  { update, view: (_model, h) => Separator.view({}, [], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-Separator')).toHaveAttr('data-accent-color', 'gray'),
))
