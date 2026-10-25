import { createLazy } from '@wsagency/wseffect-foldkit/html'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, expect, it, vi } from 'vitest'
import * as AccessibleIcon from '../src/components/accessible-icon.js'
import * as VisuallyHidden from '../src/components/visually-hidden.js'
import * as Progress from '../src/components/progress.js'
import * as Separator from '../src/components/separator.js'
import * as Skeleton from '../src/components/skeleton.js'
import * as Spinner from '../src/components/spinner.js'

const Message = defineMessageUnion({ Tick: {}, Change: {} })
type Message = typeof Message.Type
type Model = { changed: boolean }
const update = (model: Model, message: Message) => ({ model: message._tag === 'Change' ? { changed: true } : model })
const views = {
  icon: vi.fn((label: string, h: HtmlBuilder<Message>) => AccessibleIcon.view({ label }, ['I'], h)),
  hidden: vi.fn((text: string, h: HtmlBuilder<Message>) => VisuallyHidden.view({}, [text], h)),
  progress: vi.fn((value: number, h: HtmlBuilder<Message>) => Progress.view({ value, max: 100 }, [], h)),
  separator: vi.fn((size: '1' | '2', h: HtmlBuilder<Message>) => Separator.view({ size }, [], h)),
  skeleton: vi.fn((width: string, h: HtmlBuilder<Message>) => Skeleton.view({ width }, ['S'], h)),
  spinner: vi.fn((size: '1' | '2', h: HtmlBuilder<Message>) => Spinner.view({ size }, [], h)),
}
const lazy = { icon: createLazy(), hidden: createLazy(), progress: createLazy(), separator: createLazy(), skeleton: createLazy(), spinner: createLazy() }

describe('accessibility view execution counters', () => {
  it('unrelated update reuses view; changed arg re-executes once', () => {
    const view = (model: Model, h: HtmlBuilder<Message>) => h.div([], [
      lazy.icon(views.icon, [model.changed ? 'Close' : 'Close', h]),
      lazy.hidden(views.hidden, ['Help', h]),
      lazy.progress(views.progress, [model.changed ? 50 : 50, h]),
      lazy.separator(views.separator, [model.changed ? '2' : '1', h]),
      lazy.skeleton(views.skeleton, ['100%', h]),
      lazy.spinner(views.spinner, ['1', h]),
      h.button([h.OnClick(Message.Tick())], ['unrelated']),
      h.button([h.OnClick(Message.Change())], ['change']),
    ])
    Scene.scene({ update, view }, Scene.given({ changed: false }),
      Scene.click(Scene.role('button', { name: 'unrelated' })),
      Scene.expect(Scene.selector('.rt-ProgressRoot')).toExist(),
      Scene.click(Scene.role('button', { name: 'change' })),
      Scene.expect(Scene.selector('.rt-Separator')).toExist())
    for (const name of Object.keys(views) as Array<keyof typeof views>) expect(views[name]).toHaveBeenCalledTimes(name === 'separator' ? 2 : 1)
  })
})
