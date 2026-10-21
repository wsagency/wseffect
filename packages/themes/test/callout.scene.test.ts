import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as Callout from '../src/components/callout.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => h.div([], [Callout.Root.view({ size: '2' }, [], h), Callout.Icon.view({}, ['!'], h), Callout.Text.view({ size: '2' }, ['Message'], h)])
describe('themed Callout', () => it('composes root icon text without context', () => Scene.scene({ update, view }, Scene.given({}), Scene.expect(Scene.selector('.rt-CalloutRoot')).toExist(), Scene.expect(Scene.selector('.rt-CalloutIcon')).toExist(), Scene.expect(Scene.selector('.rt-CalloutText')).toExist())))
it('wires non-default Callout props to their R2S-equivalent parts', () => Scene.scene(
  { update, view: (_model, h) => h.div([], [
    Callout.Root.view({ size: '3', variant: 'outline', color: 'crimson', highContrast: true, m: '2' }, [], h),
    Callout.Icon.view({}, ['!'], h),
    Callout.Text.view({ size: '3', color: 'crimson', m: '2' }, ['Message'], h),
  ]) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-CalloutRoot')).toHaveAttr('class', 'rt-CalloutRoot rt-r-size-3 rt-variant-outline rt-high-contrast rt-r-m-2'),
  Scene.expect(Scene.selector('.rt-CalloutRoot')).toHaveAttr('data-accent-color', 'crimson'),
  Scene.expect(Scene.selector('.rt-CalloutIcon')).toHaveClass('rt-CalloutIcon'),
  Scene.expect(Scene.selector('.rt-CalloutText')).toHaveAttr('class', 'rt-CalloutText rt-r-size-3 rt-r-m-2'),
  Scene.expect(Scene.selector('.rt-CalloutText')).toHaveAttr('data-accent-color', 'crimson'),
))
