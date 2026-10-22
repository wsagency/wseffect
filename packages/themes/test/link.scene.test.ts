import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as Link from '../src/components/link.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => Link.view({ href: '/docs' }, ['Documentation'], h)
describe('themed Link', () => it('renders native link', () => Scene.scene({ update, view }, Scene.given({}), Scene.expect(Scene.role('link', { name: 'Documentation' })).toHaveAttr('href', '/docs'))))
it('wires non-default Link props to R2S classes and attributes', () => Scene.scene(
  { update, view: (_model, h) => Link.view({ href: '/download', target: '_blank', rel: 'noopener', download: 'report.pdf', size: '4', weight: 'bold', trim: 'both', truncate: true, wrap: 'balance', underline: 'hover', color: 'crimson', highContrast: true, m: '2' }, ['Download'], h) },
  Scene.given({}),
  Scene.expect(Scene.role('link', { name: 'Download' })).toHaveAttr('href', '/download'),
  Scene.expect(Scene.role('link', { name: 'Download' })).toHaveAttr('target', '_blank'),
  Scene.expect(Scene.role('link', { name: 'Download' })).toHaveAttr('rel', 'noopener'),
  Scene.expect(Scene.role('link', { name: 'Download' })).toHaveAttr('download', 'report.pdf'),
  Scene.expect(Scene.role('link', { name: 'Download' })).toHaveClass('rt-r-size-4'),
  Scene.expect(Scene.role('link', { name: 'Download' })).toHaveClass('rt-r-weight-bold'),
  Scene.expect(Scene.role('link', { name: 'Download' })).toHaveClass('rt-r-lt-both'),
  Scene.expect(Scene.role('link', { name: 'Download' })).toHaveClass('rt-truncate'),
  Scene.expect(Scene.role('link', { name: 'Download' })).toHaveClass('rt-r-tw-balance'),
  Scene.expect(Scene.role('link', { name: 'Download' })).toHaveClass('rt-underline-hover'),
  Scene.expect(Scene.role('link', { name: 'Download' })).toHaveClass('rt-high-contrast'),
  Scene.expect(Scene.role('link', { name: 'Download' })).toHaveClass('rt-r-m-2'),
  Scene.expect(Scene.role('link', { name: 'Download' })).toHaveAttr('data-accent-color', 'crimson'),
))
