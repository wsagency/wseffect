import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { it } from 'vitest'
import * as ContextMenu from '../src/context-menu.js'
import { Stream } from 'effect'
import * as Menu from '@wsagency/wseffect-foldkit-ui/menu'

const menu = ContextMenu.createContextMenu<'disabled' | 'enabled'>()
const config: ContextMenu.ContextMenuConfig<'disabled' | 'enabled'> = {
  id: 'actions', sourceId: 'source', sourceToken: 'token', longPressMs: 600,
  items: [
    { value: 'disabled', textValue: 'Disabled', isDisabled: true, content: null },
    { value: 'enabled', textValue: 'Enabled', isDisabled: false, content: null },
  ],
  toItem: () => null,
}
const openModel = menu.update(menu.init(config), {
  _tag: 'OpenedAt', invocation: { sourceId: 'source', sourceToken: 'token', invocation: 'keyboard' },
}).model
const update = (model: ContextMenu.ContextMenuModel, message: ContextMenu.ContextMenuMessage) => menu.update(model, message)
const render = (model: ContextMenu.ContextMenuModel, h: HtmlBuilder<ContextMenu.ContextMenuMessage>) => menu.view(model, config, h)
const sourceMount = { name: 'ContextMenuSourceEvents', f: () => Stream.empty }
const anchorMount = { name: 'ContextMenuAnchor', f: () => Stream.empty }

it('keeps default menu markup headless while marking the active enabled item', () => {
  Scene.scene(
    { update, view: render },
    Scene.given(openModel),
    Scene.Mount.resolve(sourceMount, Menu.Message.IgnoredMouseClick()),
    Scene.Mount.resolve(anchorMount, Menu.Message.CompletedAnchorMenu()),
    Scene.expect(Scene.role('menu')).toExist(),
    Scene.expect(Scene.selector('#actions-item-1')).toHaveAttr('data-active', ''),
    Scene.expect(Scene.selector('[role="menuitem"][aria-disabled="true"]')).toExist(),
    Scene.expect(Scene.selector('.rt-PopperContent')).not.toExist(),
    Scene.expect(Scene.selector('.rt-BaseMenuContent')).not.toExist(),
    Scene.expect(Scene.selector('.rt-ContextMenuContent')).not.toExist(),
    Scene.expect(Scene.selector('.rt-reset')).not.toExist(),
    Scene.expect(Scene.selector('.rt-BaseMenuItem')).not.toExist(),
    Scene.expect(Scene.selector('.rt-ContextMenuItem')).not.toExist(),
    Scene.expect(Scene.selector('.rt-BaseMenuGroup')).not.toExist(),
    Scene.expect(Scene.selector('.rt-ContextMenuGroup')).not.toExist(),
    Scene.expect(Scene.selector('.rt-BaseMenuLabel')).not.toExist(),
    Scene.expect(Scene.selector('.rt-ContextMenuLabel')).not.toExist(),
    Scene.expect(Scene.selector('.rt-BaseMenuSeparator')).not.toExist(),
    Scene.expect(Scene.selector('.rt-ContextMenuSeparator')).not.toExist(),
  )
})
it('applies configured presentation classes', () => {
  const styledConfig = {
    ...config,
    items: [
      ...config.items,
      { kind: 'separator' as const, id: 'styled-separator' },
      { id: 'styled-group', label: null, items: [{ value: 'enabled' as const, textValue: 'Grouped', isDisabled: false, content: null }] },
    ],
    classes: {
      panel: 'provided-panel', item: 'provided-item', group: 'provided-group',
      groupLabel: 'provided-group-label', separator: 'provided-separator',
    },
  }
  const renderStyled = (model: ContextMenu.ContextMenuModel, h: HtmlBuilder<ContextMenu.ContextMenuMessage>) =>
    menu.view(model, styledConfig, h)
  Scene.scene(
    { update, view: renderStyled },
    Scene.given(openModel),
    Scene.Mount.resolve(sourceMount, Menu.Message.IgnoredMouseClick()),
    Scene.Mount.resolve(anchorMount, Menu.Message.CompletedAnchorMenu()),
    Scene.expect(Scene.role('menu')).toHaveAttr('class', 'provided-panel'),
    Scene.expect(Scene.selector('.provided-item')).toHaveAttr('class', 'provided-item'),
    Scene.expect(Scene.selector('.provided-group')).toHaveAttr('class', 'provided-group'),
    Scene.expect(Scene.selector('.provided-group-label')).toHaveAttr('class', 'provided-group-label'),
    Scene.expect(Scene.role('separator')).toHaveAttr('class', 'provided-separator'),
  )
})
