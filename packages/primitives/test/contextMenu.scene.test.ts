import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { it } from 'vitest'
import * as ContextMenu from '../src/context-menu.js'
import { Stream } from 'effect'
import * as Menu from '@foldkit/ui/menu'

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

it('menu semantics and active enabled item', () => {
  Scene.scene(
    { update, view: render },
    Scene.given(openModel),
    Scene.Mount.resolve(sourceMount, Menu.Message.IgnoredMouseClick()),
    Scene.Mount.resolve(anchorMount, Menu.Message.CompletedAnchorMenu()),
    Scene.expect(Scene.role('menu')).toExist(),
    Scene.expect(Scene.selector('#actions-item-1')).toHaveAttr('data-active', ''),
    Scene.expect(Scene.selector('[role="menuitem"][aria-disabled="true"]')).toExist(),
  )
})
