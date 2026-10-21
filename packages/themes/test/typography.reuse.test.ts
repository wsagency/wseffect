import { createLazy } from 'foldkit/html'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
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
