import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as Skeleton from '../src/components/skeleton.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => Skeleton.view({}, ['placeholder'], h)
describe('themed Skeleton', () => {
  it('does not create an implicit live region', () => Scene.scene({ update, view }, Scene.given({}),
    Scene.expect(Scene.selector('[aria-live]')).not.toExist(),
    Scene.expect(Scene.selector('.rt-Skeleton')).toExist()))
})
it('wires non-default Skeleton props to R2S classes, styles, and attributes', () => Scene.scene(
  { update, view: (_model, h) => Skeleton.view({ loading: true, width: '100%', height: '2rem', m: '2' }, ['placeholder'], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-Skeleton')).toHaveAttr('class', 'rt-Skeleton rt-r-w rt-r-h rt-r-m-2'),
  Scene.expect(Scene.selector('.rt-Skeleton')).toHaveStyle('--width', '100%'),
  Scene.expect(Scene.selector('.rt-Skeleton')).toHaveStyle('--height', '2rem'),
  Scene.expect(Scene.selector('.rt-Skeleton')).toHaveAttr('aria-hidden', 'true'),
  Scene.expect(Scene.selector('.rt-Skeleton')).toHaveAttr('tabindex', '-1'),
  Scene.expect(Scene.selector('.rt-Skeleton')).toHaveAttr('inert', ''),
))
it('suppresses Skeleton attributes when loading is false', () => Scene.scene(
  { update, view: (_model, h) => h.div([], [Skeleton.view({ loading: false, width: '100%', height: '2rem' }, ['loaded'], h)]) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-Skeleton')).not.toExist(),
  Scene.expect(Scene.selector('[aria-hidden="true"]')).not.toExist(),
  Scene.expect(Scene.text('loaded')).toExist(),
))
