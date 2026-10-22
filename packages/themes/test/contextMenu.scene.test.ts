import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as Menu from '@foldkit/ui/menu'
import * as ContextMenu from '../src/components/context-menu.js'

const contextMenu = ContextMenu.create<'edit' | 'delete'>()
const config: ContextMenu.Config<'edit' | 'delete'> = {
  id: 'actions', sourceId: 'source', sourceToken: 'live-source-token', longPressMs: 600,
  items: [
    { value: 'edit', textValue: 'Edit', isDisabled: false, content: null },
    { kind: 'separator', id: 'main-separator' },
    { id: 'more-actions', label: null, items: [{ value: 'delete', textValue: 'Delete', isDisabled: false, content: null }] },
  ],
  toItem: () => null,
}
const selectedEdit: ContextMenu.OutMessage<'edit' | 'delete'> = { _tag: 'Selected', value: 'edit', index: 0 }
const focusReturnCommand = contextMenu.update({
  ...contextMenu.init(config),
  invocation: { sourceId: config.sourceId, sourceToken: config.sourceToken, invocation: 'keyboard' },
}, Menu.Message.Closed()).commands?.[0]
if (focusReturnCommand === undefined) throw new Error('ContextMenu close must restore focus to the invocation source')
const update = (model: ContextMenu.Model, message: ContextMenu.Message) => contextMenu.update(model, message)
const view = (model: ContextMenu.Model, h: HtmlBuilder<ContextMenu.Message>) => contextMenu.view(model, config, h)

describe('themed ContextMenu', () => {
  it('opens from focused source and activates a focused menuitem with Enter', () => {
    Scene.scene<ContextMenu.Model, ContextMenu.Message, ContextMenu.OutMessage<'edit' | 'delete'>>(
      { update, view },
      Scene.given(contextMenu.init(config)),
      Scene.Mount.resolve({ name: 'ContextMenuSourceEvents' }, Menu.Message.IgnoredMouseClick()),
      Scene.focus(Scene.selector('#source')),
      Scene.keydown(Scene.selector('#source'), 'ContextMenu'),
      Scene.Mount.resolve({ name: 'ContextMenuAnchor' }, Menu.Message.CompletedAnchorMenu()),
      Scene.expect(Scene.role('menu')).toExist(),
      Scene.expect(Scene.selector('#source')).toHaveAttr('tabindex', '0'),
      Scene.expect(Scene.selector('#actions-item-0')).toHaveAttr('role', 'menuitem'),
      Scene.focus(Scene.selector('#actions-item-0')),
      Scene.keydown(Scene.selector('#actions-item-0'), 'Enter'),
      Scene.expectOutMessage(selectedEdit),
      Scene.Command.resolve(focusReturnCommand, Menu.Message.CompletedFocusButton()),
      Scene.expect(Scene.role('menu')).not.toExist(),
      Scene.Mount.expectEnded({ name: 'ContextMenuAnchor' }),
    )
  })
  it('renders themed content, item, group, group-label, and separator classes', () => {
    Scene.scene<ContextMenu.Model, ContextMenu.Message, ContextMenu.OutMessage<'edit' | 'delete'>>(
      { update, view },
      Scene.given(contextMenu.init(config)),
      Scene.Mount.resolve({ name: 'ContextMenuSourceEvents' }, Menu.Message.IgnoredMouseClick()),
      Scene.focus(Scene.selector('#source')),
      Scene.keydown(Scene.selector('#source'), 'ContextMenu'),
      Scene.Mount.resolve({ name: 'ContextMenuAnchor' }, Menu.Message.CompletedAnchorMenu()),
      Scene.expect(Scene.role('menu')).toHaveAttr('class', 'rt-PopperContent rt-BaseMenuContent rt-ContextMenuContent rt-r-size-2 rt-variant-solid'),
      Scene.expect(Scene.selector('.rt-BaseMenuItem')).toHaveAttr('class', 'rt-reset rt-BaseMenuItem rt-ContextMenuItem'),
      Scene.expect(Scene.selector('.rt-BaseMenuGroup')).toHaveAttr('class', 'rt-BaseMenuGroup rt-ContextMenuGroup'),
      Scene.expect(Scene.selector('.rt-BaseMenuSeparator')).toHaveAttr('class', 'rt-BaseMenuSeparator rt-ContextMenuSeparator'),
      Scene.expect(Scene.selector('.rt-BaseMenuLabel')).toHaveAttr('class', 'rt-BaseMenuLabel rt-ContextMenuLabel'),
    )
  })
  // Parity matrix: R2S context-menu.tsx:31-45 and context-menu.props.ts:1-6.
  it('maps content variant, responsive size, color, and high contrast to pinned classes and marker', () => {
    const styledConfig = { ...config, variant: 'soft' as const, size: { initial: '1' as const, md: '2' as const }, color: 'crimson' as const, highContrast: true }
    const styledContextMenu = ContextMenu.create<'edit' | 'delete'>()
    const styledView = (model: ContextMenu.Model, h: HtmlBuilder<ContextMenu.Message>) => styledContextMenu.view(model, styledConfig, h)
    Scene.scene<ContextMenu.Model, ContextMenu.Message, ContextMenu.OutMessage<'edit' | 'delete'>>(
      { update: styledContextMenu.update, view: styledView },
      Scene.given(styledContextMenu.init(styledConfig)),
      Scene.Mount.resolve({ name: 'ContextMenuSourceEvents' }, Menu.Message.IgnoredMouseClick()),
      Scene.focus(Scene.selector('#source')),
      Scene.keydown(Scene.selector('#source'), 'ContextMenu'),
      Scene.Mount.resolve({ name: 'ContextMenuAnchor' }, Menu.Message.CompletedAnchorMenu()),
      Scene.expect(Scene.role('menu')).toHaveAttr('class', 'rt-PopperContent rt-BaseMenuContent rt-ContextMenuContent rt-r-size-1 md:rt-r-size-2 rt-variant-soft rt-high-contrast'),
      Scene.expect(Scene.role('menu')).toHaveAttr('data-accent-color', 'crimson'),
    )
  })

  it('activates a focused menuitem with Space', () => {
    Scene.scene<ContextMenu.Model, ContextMenu.Message, ContextMenu.OutMessage<'edit' | 'delete'>>(
      { update, view },
      Scene.given(contextMenu.init(config)),
      Scene.Mount.resolve({ name: 'ContextMenuSourceEvents' }, Menu.Message.IgnoredMouseClick()),
      Scene.focus(Scene.selector('#source')),
      Scene.keydown(Scene.selector('#source'), 'ContextMenu'),
      Scene.Mount.resolve({ name: 'ContextMenuAnchor' }, Menu.Message.CompletedAnchorMenu()),
      Scene.expect(Scene.role('menu')).toExist(),
      Scene.focus(Scene.selector('#actions-item-0')),
      Scene.keydown(Scene.selector('#actions-item-0'), ' '),
      Scene.expectOutMessage(selectedEdit),
      Scene.Command.resolve(focusReturnCommand, Menu.Message.CompletedFocusButton()),
      Scene.expect(Scene.role('menu')).not.toExist(),
      Scene.Mount.expectEnded({ name: 'ContextMenuAnchor' }),
    )
  })
})
