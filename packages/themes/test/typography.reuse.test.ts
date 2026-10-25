import { createLazy } from '@wsagency/wseffect-foldkit/html'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, expect, it, vi } from 'vitest'
import * as Blockquote from '../src/components/blockquote.js'
import * as Quote from '../src/components/quote.js'
import * as Em from '../src/components/em.js'
import * as Strong from '../src/components/strong.js'
import * as Code from '../src/components/code.js'
import * as Kbd from '../src/components/kbd.js'
const MessageSchema = defineMessageUnion({ Tick: {}, Change: {} })
type Message = typeof MessageSchema.Type
type Model = { changed: boolean }
const update = (model: Model, message: Message) => ({ model: message._tag === 'Change' ? { changed: true } : model })
const views = {
  blockquote: vi.fn((h: HtmlBuilder<Message>) => Blockquote.view({}, ['B'], h)),
  quote: vi.fn((h: HtmlBuilder<Message>) => Quote.view({}, ['Q'], h)),
  em: vi.fn((truncate: boolean, h: HtmlBuilder<Message>) => Em.view({ truncate }, ['E'], h)),
  strong: vi.fn((h: HtmlBuilder<Message>) => Strong.view({}, ['S'], h)),
  code: vi.fn((h: HtmlBuilder<Message>) => Code.view({}, ['C'], h)),
  kbd: vi.fn((h: HtmlBuilder<Message>) => Kbd.view({}, ['K'], h)),
}
const lazy = { blockquote: createLazy(), quote: createLazy(), em: createLazy(), strong: createLazy(), code: createLazy(), kbd: createLazy() }
describe('typography view execution counters', () => it('unrelated update reuses view; changed arg re-executes once', () => {
  const view = (model: Model, h: HtmlBuilder<Message>) => h.div([], [
    lazy.blockquote(views.blockquote, [h]), lazy.quote(views.quote, [h]), lazy.em(views.em, [model.changed, h]),
    lazy.strong(views.strong, [h]), lazy.code(views.code, [h]), lazy.kbd(views.kbd, [h]),
    h.button([h.OnClick(MessageSchema.Tick())], ['unrelated']), h.button([h.OnClick(MessageSchema.Change())], ['change']),
  ])
  Scene.scene({ update, view }, Scene.given({ changed: false }), Scene.click(Scene.role('button', { name: 'unrelated' })), Scene.expect(Scene.text('E')).toExist(), Scene.click(Scene.role('button', { name: 'change' })), Scene.expect(Scene.text('E')).toExist())
  for (const name of Object.keys(views) as Array<keyof typeof views>) expect(views[name]).toHaveBeenCalledTimes(name === 'em' ? 2 : 1)
}))
it('wires non-default Blockquote props to R2S classes and attributes', () => Scene.scene(
  { update, view: (_model, h) => Blockquote.view({ size: '4', weight: 'bold', color: 'crimson', highContrast: true, truncate: true, wrap: 'nowrap', m: '2' }, ['B'], h) },
  Scene.given({}),
  Scene.expect(Scene.text('B')).toExist(),
  Scene.expect(Scene.selector('blockquote')).toHaveClass('rt-Text'),
  Scene.expect(Scene.selector('blockquote')).toHaveClass('rt-Blockquote'),
  Scene.expect(Scene.selector('blockquote')).toHaveClass('rt-r-size-4'),
  Scene.expect(Scene.selector('blockquote')).toHaveClass('rt-r-weight-bold'),
  Scene.expect(Scene.selector('blockquote')).toHaveClass('rt-high-contrast'),
  Scene.expect(Scene.selector('blockquote')).toHaveClass('rt-truncate'),
  Scene.expect(Scene.selector('blockquote')).toHaveClass('rt-r-tw-nowrap'),
  Scene.expect(Scene.selector('blockquote')).toHaveClass('rt-r-m-2'),
  Scene.expect(Scene.selector('blockquote')).toHaveAttr('data-accent-color', 'crimson'),
))
it('wires non-default Quote props to R2S classes', () => Scene.scene(
  { update, view: (_model, h) => Quote.view({ truncate: true, wrap: 'pretty' }, ['Q'], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-Quote')).toHaveClass('rt-truncate'),
  Scene.expect(Scene.selector('.rt-Quote')).toHaveClass('rt-r-tw-pretty'),
))
it('wires non-default Em props to R2S classes', () => Scene.scene(
  { update, view: (_model, h) => Em.view({ truncate: true, wrap: 'balance' }, ['E'], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-Em')).toHaveClass('rt-truncate'),
  Scene.expect(Scene.selector('.rt-Em')).toHaveClass('rt-r-tw-balance'),
))
it('wires non-default Strong props to R2S classes', () => Scene.scene(
  { update, view: (_model, h) => Strong.view({ truncate: true, wrap: 'nowrap' }, ['S'], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-Strong')).toHaveClass('rt-truncate'),
  Scene.expect(Scene.selector('.rt-Strong')).toHaveClass('rt-r-tw-nowrap'),
))
it('wires non-default Code props to R2S classes and attributes', () => Scene.scene(
  { update, view: (_model, h) => Code.view({ size: '3', variant: 'outline', weight: 'bold', color: 'crimson', highContrast: true, truncate: true, wrap: 'pretty', m: '2' }, ['C'], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-Code')).toHaveClass('rt-r-size-3'),
  Scene.expect(Scene.selector('.rt-Code')).toHaveClass('rt-variant-outline'),
  Scene.expect(Scene.selector('.rt-Code')).toHaveClass('rt-r-weight-bold'),
  Scene.expect(Scene.selector('.rt-Code')).toHaveClass('rt-high-contrast'),
  Scene.expect(Scene.selector('.rt-Code')).toHaveClass('rt-truncate'),
  Scene.expect(Scene.selector('.rt-Code')).toHaveClass('rt-r-tw-pretty'),
  Scene.expect(Scene.selector('.rt-Code')).toHaveClass('rt-r-m-2'),
  Scene.expect(Scene.selector('.rt-Code')).toHaveAttr('data-accent-color', 'crimson'),
))
it('wires non-default Kbd props to R2S classes', () => Scene.scene(
  { update, view: (_model, h) => Kbd.view({ size: '3', variant: 'soft', m: '2' }, ['K'], h) },
  Scene.given({}),
  Scene.expect(Scene.selector('.rt-Kbd')).toHaveClass('rt-r-size-3'),
  Scene.expect(Scene.selector('.rt-Kbd')).toHaveClass('rt-variant-soft'),
  Scene.expect(Scene.selector('.rt-Kbd')).toHaveClass('rt-r-m-2'),
))
