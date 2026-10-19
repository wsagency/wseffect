import * as Option from 'effect/Option'
import { Schema } from 'effect'
import * as UiMenu from '@foldkit/ui/menu'
import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as DropdownMenu from '../src/components/dropdown-menu.js'

const Menu = DropdownMenu.create<'edit' | 'delete'>()
const ParentMessage = defineMessageUnion({ GotMenu: { message: Menu.Message } })
const ParentOutMessage = defineMessageUnion({ Selected: { value: Schema.String, index: Schema.Number } })
type ParentModel = Readonly<{ menu: typeof Menu.Model.Type }>
type ParentMessage = typeof ParentMessage.Type
type ParentOutMessage = typeof ParentOutMessage.Type
const foldMenu = Menu.fold<ParentModel, ParentMessage, ParentOutMessage>({
  read: model => Option.some(model.menu),
  write: (model, menu) => ({ ...model, menu }),
  toParentMessage: message => ParentMessage.GotMenu({ message }),
  foldOutMessage: outMessage => model => ({ model, outMessage: ParentOutMessage.Selected({ value: outMessage.value, index: outMessage.index }) }),
})
const update = (model: ParentModel, message: ParentMessage) => ParentMessage.match(message, {
  GotMenu: ({ message: childMessage }) => foldMenu(model, childMessage),
})
const view = (model: ParentModel, h: HtmlBuilder<ParentMessage>) => Menu.embed(h, {
  slotId: 'actions',
  model: model.menu,
  toParentMessage: message => ParentMessage.GotMenu({ message }),
  viewInputs: {
    items: ['edit', 'delete'],
    itemToConfig: item => ({ content: h.span([], [item]) }),
    buttonContent: h.span([], ['Actions']),
  },
})

describe('themed DropdownMenu view', () => {
  it('renders an accessible themed trigger', () => {
    Scene.scene(
      { update, view },
      Scene.given({ menu: Menu.init({ id: 'actions' }) }),
      Scene.expect(Scene.role('button', { name: 'Actions' })).toHaveAttr('aria-haspopup', 'menu'),
      Scene.expect(Scene.role('button', { name: 'Actions' })).toHaveAttr('aria-expanded', 'false'),
      Scene.expect(Scene.role('button', { name: 'Actions' })).toHaveAttr('class', 'rt-reset rt-BaseButton rt-r-size-2 rt-variant-solid rt-DropdownMenuTrigger'),
    )
  })

  it('opens with ArrowDown and exposes active descendant and themed menu items', () => {
    Scene.scene(
      { update, view },
      Scene.given({ menu: Menu.init({ id: 'actions' }) }),
      Scene.keydown(Scene.role('button', { name: 'Actions' }), 'ArrowDown'),
      Scene.expect(Scene.role('button', { name: 'Actions' })).toHaveAttr('aria-expanded', 'true'),
      Scene.Mount.resolve(UiMenu.AnchorMenu, UiMenu.Message.CompletedAnchorMenu()),
      Scene.Mount.resolve(UiMenu.PortalMenuBackdrop, UiMenu.Message.CompletedPortalMenuBackdrop()),
      Scene.Command.resolve(UiMenu.FocusItems, UiMenu.Message.CompletedFocusItems()),
      Scene.expect(Scene.role('menu')).toHaveAttr('class', 'rt-PopperContent rt-BaseMenuContent rt-DropdownMenuContent'),
      Scene.expect(Scene.role('menu')).toHaveAttr('aria-activedescendant', 'actions-item-0'),
      Scene.expect(Scene.role('menuitem', { name: 'edit' })).toExist(),
    )
  })
})
