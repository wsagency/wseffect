import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, it } from '@effect/vitest'
import * as Menu from './index.js'
import { createContextMenu, type ContextMenuConfig } from './context.js'

const bundle = createContextMenu<'edit' | 'delete'>()
const config: ContextMenuConfig<'edit' | 'delete'> = {
  id: 'actions',
  sourceId: 'source',
  sourceToken: 'source-token',
  items: [
    { value: 'edit', textValue: 'Edit', isDisabled: true, content: null },
    {
      id: 'more-actions',
      label: null,
      items: [{ value: 'delete', textValue: 'Delete', isDisabled: false, content: null }],
    },
  ],
}

const update = (model: Menu.Model, message: Menu.Message) => {
  const result = bundle.update(model, message)
  return result.outMessage === undefined
    ? { model: result.model }
    : { model: result.model, outMessage: result.outMessage }
}
const view = (model: Menu.Model, h: HtmlBuilder<Menu.Message>) => bundle.view(model, {
  ...config,
  items: config.items.map(item => 'items' in item
    ? {
        ...item,
        label: h.span([], ['More actions']),
        items: item.items.map(child => 'kind' in child ? child : {
          ...child,
          content: h.span([], [child.textValue]),
        }),
      }
    : 'kind' in item ? item : { ...item, content: h.span([], [item.textValue]) }),
}, h)

describe('Menu ContextMenu Scene', () => {
  it('opens from a focused source and selects the first enabled grouped item', () => {
    Scene.scene(
      { update, view },
      Scene.given(bundle.init(config)),
      Scene.Mount.resolve({ name: 'ContextMenuSourceEvents' }, Menu.Message.IgnoredMouseClick()),
      Scene.focus(Scene.selector('#source')),
      Scene.keydown(Scene.selector('#source'), 'ContextMenu'),
      Scene.expectHandled(),
      Scene.Mount.resolve({ name: 'ContextMenuAnchor' }, Menu.Message.CompletedAnchorMenu()),
      Scene.expect(Scene.role('menu')).toExist(),
      Scene.expect(Scene.selector('#source')).toHaveAttr('tabindex', '0'),
      Scene.expect(Scene.selector('#actions-item-0')).toHaveAttr('role', 'menuitem'),
      Scene.expect(Scene.role('menuitem', { name: 'Edit' })).toHaveAttr('aria-disabled', 'true'),
      Scene.expect(Scene.role('menuitem', { name: 'Delete' })).toHaveAttr('data-active', ''),
      Scene.keydown(Scene.role('menuitem', { name: 'Delete' }), 'Enter'),
      Scene.expectOutMessage({ _tag: 'Selected', value: 'delete', index: 1 }),
      Scene.expect(Scene.role('menu')).not.toExist(),
      Scene.Mount.expectEnded({ name: 'ContextMenuAnchor' }),
    )
  })

  it('supports Shift+F10 on the focusable source', () => {
    Scene.scene(
      { update, view },
      Scene.given(bundle.init(config)),
      Scene.Mount.resolve({ name: 'ContextMenuSourceEvents' }, Menu.Message.IgnoredMouseClick()),
      Scene.focus(Scene.selector('#source')),
      Scene.keydown(Scene.selector('#source'), 'F10', { shiftKey: true }),
      Scene.expectHandled(),
      Scene.Mount.resolve({ name: 'ContextMenuAnchor' }, Menu.Message.CompletedAnchorMenu()),
      Scene.expect(Scene.role('menu')).toExist(),
      Scene.expect(Scene.role('menuitem', { name: 'Delete' })).toHaveAttr('data-active', ''),
    )
  })
})
