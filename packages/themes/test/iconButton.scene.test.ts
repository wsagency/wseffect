import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as IconButton from '../src/components/icon-button.js'
const MessageSchema = defineMessageUnion({ Tick: {} })
type Message = typeof MessageSchema.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => IconButton.view({ 'aria-label': 'Add item', onClick: MessageSchema.Tick() }, [h.svg([h.AriaHidden(true)], [])], h)
describe('themed IconButton', () => it('requires accessible name and keeps button semantics', () => Scene.scene({ update, view }, Scene.given({}), Scene.expect(Scene.role('button', { name: 'Add item' })).toExist(), Scene.expect(Scene.selector('button.rt-IconButton')).toExist())))
it('wires non-default IconButton props to R2S classes and attributes', () => Scene.scene(
  { update, view: (_model, h) => IconButton.view({ size: '3', variant: 'ghost', color: 'crimson', radius: 'full', highContrast: true, disabled: true, loading: true, type: 'submit', 'aria-label': 'Save', m: '2' }, ['Save'], h) },
  Scene.given({}),
  Scene.expect(Scene.role('button', { name: 'Save' })).toHaveAttr('type', 'submit'),
  Scene.expect(Scene.role('button', { name: 'Save' })).toHaveAttr('disabled', ''),
  Scene.expect(Scene.role('button', { name: 'Save' })).toHaveAttr('data-disabled', ''),
  Scene.expect(Scene.role('button', { name: 'Save' })).toHaveClass('rt-r-size-3'),
  Scene.expect(Scene.role('button', { name: 'Save' })).toHaveClass('rt-variant-ghost'),
  Scene.expect(Scene.role('button', { name: 'Save' })).toHaveClass('rt-IconButton'),
  Scene.expect(Scene.role('button', { name: 'Save' })).toHaveClass('rt-high-contrast'),
  Scene.expect(Scene.role('button', { name: 'Save' })).toHaveClass('rt-loading'),
  Scene.expect(Scene.role('button', { name: 'Save' })).toHaveClass('rt-r-m-2'),
  Scene.expect(Scene.role('button', { name: 'Save' })).toHaveAttr('data-accent-color', 'crimson'),
  Scene.expect(Scene.role('button', { name: 'Save' })).toHaveAttr('data-radius', 'full'),
))
it('overlays the loading spinner over content', () => Scene.scene(
  { update, view: (_model, h) => IconButton.view({ 'aria-label': 'Save', loading: true }, ['Save'], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-BaseButton')).toHaveClass('rt-loading'),
  Scene.expect(Scene.selector('[aria-hidden="true"]')).toHaveStyle('position', 'absolute'),
  Scene.expect(Scene.selector('[aria-hidden="true"]')).toHaveStyle('inset', '0'),
  Scene.expect(Scene.selector('[aria-hidden="true"] .rt-Spinner')).toExist(),
  Scene.expect(Scene.selector('.rt-ButtonContent')).toExist(),
))
it('maps button size four to the pinned larger loading spinner', () => Scene.scene(
  { update, view: (_model, h) => IconButton.view({ size: '4', 'aria-label': 'Save', loading: true }, ['Save'], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-Spinner')).toHaveClass('rt-r-size-3'),
))
