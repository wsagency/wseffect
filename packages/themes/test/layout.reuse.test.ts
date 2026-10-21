import { createLazy } from 'foldkit/html'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { describe, expect, it, vi } from 'vitest'
import * as AspectRatio from '../src/components/aspect-ratio.js'
import * as Container from '../src/components/container.js'
import * as Inset from '../src/components/inset.js'
import * as Section from '../src/components/section.js'
import * as ScrollArea from '../src/components/scroll-area.js'
const Message = defineMessageUnion({ Tick: {}, Change: {} })
type Message = typeof Message.Type
type Model = { changed: boolean }
const update = (model: Model, message: Message) => ({ model: message._tag === 'Change' ? { changed: true } : model })
const views = {
  aspect: vi.fn((ratio: number, h: HtmlBuilder<Message>) => AspectRatio.view({ ratio }, ['A'], h)),
  container: vi.fn((size: '1' | '2', h: HtmlBuilder<Message>) => Container.view({ size }, ['C'], h)),
  inset: vi.fn((side: 'x' | 'y', h: HtmlBuilder<Message>) => Inset.view({ side }, ['I'], h)),
  section: vi.fn((size: '1' | '2', h: HtmlBuilder<Message>) => Section.view({ size }, ['S'], h)),
  scrollArea: vi.fn((scrollbars: 'vertical' | 'both', h: HtmlBuilder<Message>) => ScrollArea.view({ scrollbars }, ['R'], h)),
}
const lazy = { aspect: createLazy(), container: createLazy(), inset: createLazy(), section: createLazy(), scrollArea: createLazy() }
describe('layout view execution counters', () => {
  it('unrelated update reuses view; changed arg re-executes once', () => {
    const view = (model: Model, h: HtmlBuilder<Message>) => h.div([], [
      lazy.aspect(views.aspect, [model.changed ? 2 : 1, h]), lazy.container(views.container, ['1', h]),
      lazy.inset(views.inset, ['x', h]), lazy.section(views.section, ['1', h]), lazy.scrollArea(views.scrollArea, ['vertical', h]),
      h.button([h.OnClick(Message.Tick())], ['unrelated']), h.button([h.OnClick(Message.Change())], ['change']),
    ])
    Scene.scene({ update, view }, Scene.given({ changed: false }), Scene.click(Scene.role('button', { name: 'unrelated' })), Scene.expect(Scene.text('A')).toExist(), Scene.click(Scene.role('button', { name: 'change' })), Scene.expect(Scene.text('A')).toExist())
    for (const name of Object.keys(views) as Array<keyof typeof views>) expect(views[name]).toHaveBeenCalledTimes(name === 'aspect' ? 2 : 1)
  })
})
