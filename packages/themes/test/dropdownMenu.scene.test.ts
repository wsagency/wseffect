import * as Option from 'effect/Option'
import { Schema } from 'effect'
import * as UiMenu from '@wsagency/wseffect-foldkit-ui/menu'
import { createKeyedLazy, type HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, expect, it, vi } from 'vitest'
import * as DropdownMenu from '../src/components/dropdown-menu.js'
import * as Theme from '../src/components/theme.js'
import * as ThemeAttributes from '../src/components/themeAttributes.js'

const Menu = DropdownMenu.create<'edit' | 'delete'>()
const ParentMessage = defineMessageUnion({ GotMenu: { message: Menu.Message }, Tick: {} })
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
  Tick: () => ({ model }),
})
const view = (model: ParentModel, h: HtmlBuilder<ParentMessage>) => Menu.embed(h, {
  slotId: 'actions',
  model: model.menu,
  toParentMessage: message => ParentMessage.GotMenu({ message }),
  viewInputs: {
    themeSettings: {
      accentColor: 'crimson',
      grayColor: 'auto',
      radius: 'full',
      scaling: '110%',
      appearance: 'dark',
      panelBackground: 'solid',
      hasBackground: true,
    },
    items: ['edit', 'delete'],
    itemToConfig: item => ({ content: h.span([], [item]) }),
    buttonContent: h.span([], ['Actions']),
  },
})
const rootThemeView = (model: ParentModel, h: HtmlBuilder<ParentMessage>) => Theme.view(
  {
    settings: {
      accentColor: 'crimson',
      grayColor: 'mauve',
      radius: 'full',
      scaling: '100%',
      appearance: 'dark',
      panelBackground: 'solid',
      hasBackground: true,
    },
    isRoot: true,
  },
  [Menu.embed(h, {
    slotId: 'actions',
    model: model.menu,
    toParentMessage: message => ParentMessage.GotMenu({ message }),
    viewInputs: {
      items: ['edit', 'delete'],
      itemToConfig: item => ({ content: h.span([], [item]) }),
      buttonContent: h.span([], ['Actions']),
    },
  })],
  h,
)
const nestedOverrideThemeView = (model: ParentModel, h: HtmlBuilder<ParentMessage>) => Theme.view(
  {
    settings: { accentColor: 'blue', appearance: 'dark' },
    isRoot: true,
  },
  [Menu.embed(h, {
    slotId: 'actions',
    model: model.menu,
    toParentMessage: message => ParentMessage.GotMenu({ message }),
    viewInputs: {
      themeSettings: { accentColor: 'crimson', appearance: 'light' },
      items: ['edit', 'delete'],
      itemToConfig: item => ({ content: h.span([], [item]) }),
      buttonContent: h.span([], ['Actions']),
    },
  })],
  h,
)

type PerformanceModel = Readonly<{ menus: ReadonlyArray<Readonly<{ id: string; model: typeof Menu.Model.Type }>>; tick: number }>
const performanceMenus = Array.from({ length: 200 }, (_, index) => {
  const id = `closed-${index}`
  return { id, model: Menu.init({ id }) }
})
const renderMenu = vi.fn((model: typeof Menu.Model.Type, slotId: string, h: HtmlBuilder<ParentMessage>) => Menu.embed(h, {
  slotId,
  model,
  toParentMessage: message => ParentMessage.GotMenu({ message }),
  viewInputs: {
    items: ['edit', 'delete'],
    itemToConfig: item => ({ content: h.span([], [item]) }),
    buttonContent: h.span([], ['Actions']),
  },
}))
const keyedMenu = createKeyedLazy()
const performanceUpdate = (model: PerformanceModel, _message: ParentMessage) => ({ model: { ...model, tick: model.tick + 1 } })
const performanceView = (model: PerformanceModel, h: HtmlBuilder<ParentMessage>) => h.div([], [
  ...model.menus.map(menu => keyedMenu(menu.id, renderMenu, [menu.model, menu.id, h])),
  h.button([h.OnClick(ParentMessage.Tick())], ['unrelated update']),
])

describe('themed DropdownMenu view', () => {
  it('renders an accessible themed trigger', () => {
    Scene.scene(
      { update, view },
      Scene.given({ menu: Menu.init({ id: 'actions' }) }),
      Scene.expect(Scene.role('button', { name: 'Actions' })).toHaveAttr('aria-haspopup', 'menu'),
      Scene.expect(Scene.role('button', { name: 'Actions' })).toHaveAttr('aria-expanded', 'false'),
      Scene.expect(Scene.role('button', { name: 'Actions' })).toHaveAttr('class', 'rt-reset rt-BaseButton rt-r-size-2 rt-variant-solid rt-Button'),
    )
  })
  it('does not build portal attributes for closed menus', () => {
    const portalAttributes = vi.spyOn(ThemeAttributes, 'portalThemeAttributes')
    try {
      Scene.scene(
        { update, view },
        Scene.given({ menu: Menu.init({ id: 'actions' }) }),
        Scene.expect(Scene.role('button', { name: 'Actions' })).toHaveAttr('aria-expanded', 'false'),
      )
      expect(portalAttributes).not.toHaveBeenCalled()
    } finally {
      portalAttributes.mockRestore()
    }
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
      Scene.expect(Scene.role('menu')).toHaveAttr('class', 'radix-themes dark rt-PopperContent rt-BaseMenuContent rt-DropdownMenuContent rt-r-size-2 rt-variant-solid'),
      Scene.expect(Scene.role('menu')).toHaveAttr('data-is-root-theme', 'false'),
      Scene.expect(Scene.role('menu')).toHaveAttr('data-has-background', 'false'),
      Scene.expect(Scene.role('menu')).toHaveAttr('data-panel-background', 'solid'),
      Scene.expect(Scene.role('menu')).toHaveAttr('data-accent-color', 'crimson'),
      Scene.expect(Scene.role('menu')).toHaveAttr('data-gray-color', 'mauve'),
      Scene.expect(Scene.role('menu')).toHaveAttr('data-radius', 'full'),
      Scene.expect(Scene.role('menu')).toHaveAttr('data-scaling', '110%'),
      Scene.expect(Scene.role('menu')).toHaveAttr('aria-activedescendant', 'actions-item-0'),
      Scene.expect(Scene.selector('.rt-BaseMenuViewport.rt-DropdownMenuViewport')).toExist(),
      Scene.expect(Scene.role('menuitem', { name: 'edit' })).toHaveAttr('class', 'rt-reset rt-BaseMenuItem rt-DropdownMenuItem'),
      Scene.expect(Scene.role('menuitem', { name: 'edit' })).toHaveAttr('data-active', ''),
    )
  })
  it('inherits the root Theme for portaled menus without per-menu attributes', () => {
    Scene.scene(
      { update, view: rootThemeView },
      Scene.given({ menu: Menu.init({ id: 'actions' }) }),
      Scene.keydown(Scene.role('button', { name: 'Actions' }), 'ArrowDown'),
      Scene.Mount.resolve(UiMenu.AnchorMenu, UiMenu.Message.CompletedAnchorMenu()),
      Scene.Mount.resolve(UiMenu.PortalMenuBackdrop, UiMenu.Message.CompletedPortalMenuBackdrop()),
      Scene.Command.resolve(UiMenu.FocusItems, UiMenu.Message.CompletedFocusItems()),
      Scene.expect(Scene.selector('.radix-themes.dark #foldkit-portal-root')).toExist(),
      Scene.expect(Scene.role('menu')).not.toHaveAttr('data-accent-color'),
    )
  })
  it('applies explicit nested Theme overrides to portaled menus', () => {
    Scene.scene(
      { update, view: nestedOverrideThemeView },
      Scene.given({ menu: Menu.init({ id: 'actions' }) }),
      Scene.keydown(Scene.role('button', { name: 'Actions' }), 'ArrowDown'),
      Scene.Mount.resolve(UiMenu.AnchorMenu, UiMenu.Message.CompletedAnchorMenu()),
      Scene.Mount.resolve(UiMenu.PortalMenuBackdrop, UiMenu.Message.CompletedPortalMenuBackdrop()),
      Scene.Command.resolve(UiMenu.FocusItems, UiMenu.Message.CompletedFocusItems()),
      Scene.expect(Scene.role('menu')).toHaveAttr('class', 'radix-themes light rt-PopperContent rt-BaseMenuContent rt-DropdownMenuContent rt-r-size-2 rt-variant-solid'),
      Scene.expect(Scene.role('menu')).toHaveAttr('data-accent-color', 'crimson'),
      Scene.expect(Scene.role('menu')).toHaveAttr('data-gray-color', 'mauve'),
    )
  })

  it('renders the anchored themed panel after a trigger click', () => {
    Scene.scene(
      { update, view },
      Scene.given({ menu: Menu.init({ id: 'actions' }) }),
      Scene.click(Scene.role('button', { name: 'Actions' })),
      Scene.expect(Scene.role('button', { name: 'Actions' })).toHaveAttr('aria-expanded', 'true'),
      Scene.Mount.resolve(UiMenu.AnchorMenu, UiMenu.Message.CompletedAnchorMenu()),
      Scene.Mount.resolve(UiMenu.PortalMenuBackdrop, UiMenu.Message.CompletedPortalMenuBackdrop()),
      Scene.Command.resolve(UiMenu.FocusItems, UiMenu.Message.CompletedFocusItems()),
      Scene.expect(Scene.role('menu')).toHaveAttr('class', 'radix-themes dark rt-PopperContent rt-BaseMenuContent rt-DropdownMenuContent rt-r-size-2 rt-variant-solid'),
      Scene.expect(Scene.selector('.rt-BaseMenuViewport.rt-DropdownMenuViewport')).toExist(),
    )
  })


  it('reuses 200 closed menu views on an unrelated parent update', () => {
    renderMenu.mockClear()
    Scene.scene(
      { update: performanceUpdate, view: performanceView },
      Scene.given({ menus: performanceMenus, tick: 0 }),
      Scene.click(Scene.role('button', { name: 'unrelated update' })),
      Scene.expect(Scene.role('button', { name: 'unrelated update' })).toExist(),
    )
    expect(renderMenu).toHaveBeenCalledTimes(200)
  })
})
