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
it('marks loading skeletons as inline and supports responsive minimum and maximum dimensions', () => Scene.scene(
  { update, view: (_model, h) => Skeleton.view({
    loading: true,
    width: { initial: '100%', md: '80%' },
    minWidth: { initial: '10rem', md: '12rem' },
    maxWidth: { initial: '40rem', md: '36rem' },
    height: { initial: '2rem', md: '3rem' },
    minHeight: { initial: '1rem', md: '1.5rem' },
    maxHeight: { initial: '4rem', md: '5rem' },
  }, ['placeholder'], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-Skeleton')).toHaveAttr('data-inline-skeleton', ''),
  Scene.expect(Scene.selector('.rt-Skeleton')).toHaveStyle('--min-width', '10rem'),
  Scene.expect(Scene.selector('.rt-Skeleton')).toHaveStyle('--min-width-md', '12rem'),
  Scene.expect(Scene.selector('.rt-Skeleton')).toHaveStyle('--max-width', '40rem'),
  Scene.expect(Scene.selector('.rt-Skeleton')).toHaveStyle('--max-width-md', '36rem'),
  Scene.expect(Scene.selector('.rt-Skeleton')).toHaveStyle('--min-height', '1rem'),
  Scene.expect(Scene.selector('.rt-Skeleton')).toHaveStyle('--min-height-md', '1.5rem'),
  Scene.expect(Scene.selector('.rt-Skeleton')).toHaveStyle('--max-height', '4rem'),
  Scene.expect(Scene.selector('.rt-Skeleton')).toHaveStyle('--max-height-md', '5rem'),
))
it('returns loaded children without a skeleton wrapper', () => Scene.scene(
  { update, view: (_model, h) => h.div([], [Skeleton.view({ loading: false }, [h.em([], ['loaded'])], h)]) },
  Scene.given({}),
  Scene.expect(Scene.selector('div em')).toExist(),
  Scene.expect(Scene.selector('div span')).not.toExist(),
))
