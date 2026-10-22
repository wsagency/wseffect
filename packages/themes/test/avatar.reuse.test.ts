import { createLazy } from 'foldkit/html'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, expect, it, vi } from 'vitest'
import * as Avatar from '../src/components/avatar.js'
import * as Badge from '../src/components/badge.js'
import * as Callout from '../src/components/callout.js'
import * as ThemePanel from '../src/components/theme-panel.js'
type Message = ThemePanel.Message | { _tag: 'Tick' } | { _tag: 'Change' }
type Model = { changed: boolean }
const update = (model: Model, message: Message) => ({ model: message._tag === 'Change' ? { changed: true } : model })
const views = {
  avatar: vi.fn((h: HtmlBuilder<Message>) => Avatar.view({ fallback: 'A' }, [], h)),
  badge: vi.fn((size: '1' | '2', h: HtmlBuilder<Message>) => Badge.view({ size }, ['B'], h)),
  calloutRoot: vi.fn((h: HtmlBuilder<Message>) => Callout.Root.view({ size: '2' }, [], h)),
  calloutIcon: vi.fn((h: HtmlBuilder<Message>) => Callout.Icon.view({}, ['!'], h)),
  calloutText: vi.fn((h: HtmlBuilder<Message>) => Callout.Text.view({ size: '2' }, ['C'], h)),
  panel: vi.fn((h: HtmlBuilder<Message>) => ThemePanel.view({ isOpen: true, settings: { appearance: 'light' }, toSettingsChanged: settings => ({ _tag: 'SettingsChanged', settings }) }, [], h)),
}
const lazy = { avatar: createLazy(), badge: createLazy(), root: createLazy(), icon: createLazy(), text: createLazy(), panel: createLazy() }
describe('feedback view execution counters', () => it('unrelated update reuses view; changed arg re-executes once', () => {
  const view = (model: Model, h: HtmlBuilder<Message>) => h.div([], [
    lazy.avatar(views.avatar, [h]), lazy.badge(views.badge, [model.changed ? '2' : '1', h]),
    lazy.root(views.calloutRoot, [h]), lazy.icon(views.calloutIcon, [h]), lazy.text(views.calloutText, [h]),
    lazy.panel(views.panel, [h]), h.button([h.OnClick({ _tag: 'Tick' })], ['unrelated']),
    h.button([h.OnClick({ _tag: 'Change' })], ['change']),
  ])
  Scene.scene({ update, view }, Scene.given({ changed: false }), Scene.click(Scene.role('button', { name: 'unrelated' })), Scene.expect(Scene.text('B')).toExist(), Scene.click(Scene.role('button', { name: 'change' })), Scene.expect(Scene.text('B')).toExist())
  for (const name of Object.keys(views) as Array<keyof typeof views>) expect(views[name]).toHaveBeenCalledTimes(name === 'badge' ? 2 : 1)
}))
