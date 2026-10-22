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
  Scene.expect(Scene.selector('.rt-CalloutText')).toHaveAttr('class', 'rt-Text rt-CalloutText rt-r-size-3 rt-r-m-2'),
  Scene.expect(Scene.selector('.rt-CalloutText')).toHaveAttr('data-accent-color', 'crimson'),
))
it('preserves Callout defaults and Text foundation class', () => Scene.scene(
  { update, view: (_model, h) => h.div([], [
    Callout.Root.view({ size: { sm: '3' } }, [], h),
    Callout.Text.view({}, ['Message'], h),
  ]) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-CalloutRoot')).toHaveClass('rt-r-size-2'),
  Scene.expect(Scene.selector('.rt-CalloutRoot')).toHaveClass('sm:rt-r-size-3'),
  Scene.expect(Scene.selector('.rt-CalloutRoot')).toHaveAttr('data-accent-color', ''),
  Scene.expect(Scene.selector('.rt-CalloutText')).toHaveClass('rt-Text'),
))
it('supports inherited Text modifiers across the pinned domains', () => Scene.scene(
  { update, view: (_model, h) => Callout.Text.view({ size: { md: '8' }, weight: 'bold', align: 'center', trim: 'start', wrap: 'balance', truncate: true, highContrast: true, color: 'crimson' }, ['Message'], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-CalloutText')).toHaveClass('md:rt-r-size-8'),
  Scene.expect(Scene.selector('.rt-CalloutText')).toHaveClass('rt-r-weight-bold'),
  Scene.expect(Scene.selector('.rt-CalloutText')).toHaveClass('rt-r-ta-center'),
  Scene.expect(Scene.selector('.rt-CalloutText')).toHaveClass('rt-r-lt-start'),
  Scene.expect(Scene.selector('.rt-CalloutText')).toHaveClass('rt-r-tw-balance'),
  Scene.expect(Scene.selector('.rt-CalloutText')).toHaveClass('rt-truncate'),
  Scene.expect(Scene.selector('.rt-CalloutText')).toHaveClass('rt-high-contrast'),
  Scene.expect(Scene.selector('.rt-CalloutText')).toHaveAttr('data-accent-color', 'crimson'),
))
