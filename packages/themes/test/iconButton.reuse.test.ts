import { createLazy } from 'foldkit/html'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { describe, expect, it, vi } from 'vitest'
import * as IconButton from '../src/components/icon-button.js'
import * as Link from '../src/components/link.js'
const Messages = defineMessageUnion({ Tick: {}, Change: {} })
type Message = typeof Messages.Type
type Model = { changed: boolean }
const update = (model: Model, message: Message) => ({ model: message._tag === 'Change' ? { changed: true } : model })
const views = {
  iconButton: vi.fn((size: '1' | '2', h: HtmlBuilder<Message>) => IconButton.view({ size, 'aria-label': 'Add', onClick: Messages.Tick() }, ['+'], h)),
  link: vi.fn((size: '1' | '2', h: HtmlBuilder<Message>) => Link.view({ size, href: '/docs' }, ['Docs'], h)),
}
const lazy = { iconButton: createLazy(), link: createLazy() }
describe('IconButton view execution counters', () => it('unrelated update reuses view; changed arg re-executes once', () => {
  const view = (model: Model, h: HtmlBuilder<Message>) => h.div([], [
    lazy.iconButton(views.iconButton, [model.changed ? '2' : '1', h]), lazy.link(views.link, ['1', h]),
    h.button([h.OnClick(Messages.Tick())], ['unrelated']), h.button([h.OnClick(Messages.Change())], ['change']),
  ])
  Scene.scene({ update, view }, Scene.given({ changed: false }), Scene.click(Scene.role('button', { name: 'unrelated' })), Scene.expect(Scene.role('link', { name: 'Docs' })).toExist(), Scene.click(Scene.role('button', { name: 'change' })), Scene.expect(Scene.role('link', { name: 'Docs' })).toExist())
  expect(views.iconButton).toHaveBeenCalledTimes(2)
  expect(views.link).toHaveBeenCalledTimes(1)
}))
