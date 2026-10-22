import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as Spinner from '../src/components/spinner.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => Spinner.view({}, [], h)
describe('themed Spinner', () => {
  it('does not create an implicit live region', () => Scene.scene({ update, view }, Scene.given({}),
    Scene.expect(Scene.selector('[aria-live]')).not.toExist(),
    Scene.expect(Scene.selector('.rt-Spinner')).toExist()))
})
it('wires non-default Spinner props to R2S classes and output', () => Scene.scene(
  { update, view: (_model, h) => Spinner.view({ size: '3', loading: true, m: '2' }, [], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-Spinner')).toHaveAttr('class', 'rt-Spinner rt-r-size-3 rt-r-m-2'),
))
it('keeps loading children hidden in layout beneath the overlaid indicator', () => Scene.scene(
  { update, view: (_model, h) => Spinner.view({ loading: true }, ['loading label'], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-Flex.rt-r-ai-center.rt-r-jc-center.rt-r-position-relative')).toExist(),
  Scene.expect(Scene.selector('[aria-hidden="true"]')).toHaveStyle('display', 'contents'),
  Scene.expect(Scene.selector('[aria-hidden="true"]')).toHaveStyle('visibility', 'hidden'),
  Scene.expect(Scene.selector('.rt-r-position-absolute.rt-r-inset-0 .rt-Spinner')).toExist(),
))
it('omits the indicator when loading is false', () => Scene.scene(
  { update, view: (_model, h) => Spinner.view({ loading: false }, ['loaded'], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-Spinner')).not.toExist(),
  Scene.expect(Scene.text('loaded')).toExist(),
))
