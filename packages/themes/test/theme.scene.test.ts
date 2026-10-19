import { createLazy } from 'foldkit/html'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { describe, expect, it } from 'vitest'
import * as Theme from '../src/components/theme.js'

type Settings = typeof Theme.Settings.Type
type Model = Readonly<{ settings: Partial<Settings>; isRoot: boolean }>
const Message = defineMessageUnion({ ChangedAccent: {} })
type Message = typeof Message.Type
let childViewCalls = 0
const childView = (label: string, h: HtmlBuilder<Message>) => {
  childViewCalls += 1
  return h.span([], [label])
}
const lazyChild = createLazy()
const update = (model: Model, message: Message): { model: Model } => ({
  model: message._tag === 'ChangedAccent'
    ? { ...model, settings: { ...model.settings, accentColor: 'crimson' as const } }
    : model,
})
const view = (model: Model, h: HtmlBuilder<Message>) => h.div([], [
  Theme.view({ settings: model.settings, isRoot: model.isRoot }, [lazyChild(childView, ['stable child', h])], h),
  h.button([h.OnClick(Message.ChangedAccent())], ['change accent']),
])
const root = Scene.selector('.radix-themes')

describe('Theme view', () => {
  it('reuses a memoized descendant when the root settings change', () => {
    childViewCalls = 0
    Scene.scene(
      { update, view },
      Scene.given({ settings: { accentColor: 'indigo', grayColor: 'gray' }, isRoot: true }),
      Scene.click(Scene.role('button')),
      Scene.expect(root).toHaveAttr('data-accent-color', 'crimson'),
      Scene.expect(root).toHaveAttr('data-gray-color', 'gray'),
      Scene.expect(root).toHaveAttr('data-radius', 'medium'),
    )
    expect(childViewCalls).toBe(1)
  })

  it('renders root defaults and leaves inherited appearance unclassed', () => {
    Scene.scene(
      { update, view },
      Scene.given({ settings: {}, isRoot: true }),
      Scene.expect(root).toHaveAttr('class', 'radix-themes'),
      Scene.expect(root).toHaveAttr('data-is-root-theme', 'true'),
      Scene.expect(root).toHaveAttr('data-accent-color', 'indigo'),
      Scene.expect(root).toHaveAttr('data-gray-color', 'slate'),
      Scene.expect(root).toHaveAttr('data-radius', 'medium'),
      Scene.expect(root).toHaveAttr('data-scaling', '100%'),
      Scene.expect(root).toHaveAttr('data-has-background', 'true'),
      Scene.expect(root).toHaveAttr('data-panel-background', 'translucent'),
    )
  })

  it('adds the appearance class when the root explicitly selects dark', () => {
    Scene.scene(
      { update, view },
      Scene.given({ settings: { appearance: 'dark' }, isRoot: true }),
      Scene.expect(root).toHaveAttr('class', 'radix-themes dark'),
    )
  })

  it('renders only explicitly provided nested settings', () => {
    Scene.scene(
      { update, view },
      Scene.given({ settings: { radius: 'full' }, isRoot: false }),
      Scene.expect(root).toHaveAttr('data-radius', 'full'),
      Scene.expect(root).not.toHaveAttr('data-accent-color'),
      Scene.expect(root).not.toHaveAttr('data-gray-color'),
      Scene.expect(root).not.toHaveAttr('data-is-root-theme'),
    )
  })

  it('resolves nested automatic gray from an explicitly provided accent', () => {
    Scene.scene(
      { update, view },
      Scene.given({ settings: { accentColor: 'crimson', grayColor: 'auto' }, isRoot: false }),
      Scene.expect(root).toHaveAttr('data-accent-color', 'crimson'),
      Scene.expect(root).toHaveAttr('data-gray-color', 'mauve'),
    )
  })
})
