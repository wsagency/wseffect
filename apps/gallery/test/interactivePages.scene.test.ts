import * as UiDialog from '@foldkit/ui/dialog'
import * as UiMenu from '@foldkit/ui/menu'
import * as UiTabs from '@foldkit/ui/tabs'
import * as Scene from 'foldkit/scene'
import { describe, expect, it } from 'vitest'
import { PageOutMessage, type PageInputs } from '../src/contract.js'
import { page as dialogPage } from '../src/pages/dialog.js'
import { page as dropdownMenuPage } from '../src/pages/dropdownMenu.js'
import { page as tabsPage } from '../src/pages/tabs.js'
import { page as themePage } from '../src/pages/theme.js'
import { page as sharedAPage } from '../src/pages/sharedA.js'
import { page as sharedBPage } from '../src/pages/sharedB.js'

const inputs: PageInputs = {
  date: '2026-10-19',
  accentColor: 'indigo',
  grayColor: 'auto',
  radius: 'medium',
  scaling: '100%',
  appearance: 'inherit',
  panelBackground: 'translucent',
}

describe('gallery interactive pages', () => {
  it('opens and closes the accessible dialog demo', () => {
    const initial = dialogPage.init()
    Scene.scene({ update: dialogPage.update, view: (model, h) => dialogPage.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.role('heading', { name: 'Dialog' })).toExist(),
      Scene.click(Scene.role('button', { name: 'Open dialog' })),
      Scene.Command.resolve(UiDialog.ShowDialog, UiDialog.Message.SucceededShowDialog()),
      Scene.Mount.resolve(UiDialog.AcquireResources, UiDialog.Message.SucceededAcquireResources()),
      Scene.expect(Scene.role('dialog', { name: 'Dialog example' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Close' })).toExist(),
      Scene.click(Scene.role('button', { name: 'Close' })),
      Scene.Command.resolve(UiDialog.CloseDialog, UiDialog.Message.CompletedCloseDialog()),
      Scene.Mount.expectEnded(UiDialog.AcquireResources),
      Scene.expect(Scene.role('dialog', { name: 'Dialog example' })).toBeAbsent())
  })

  it('selects an item from the accessible dropdown menu', () => {
    const initial = dropdownMenuPage.init()
    Scene.scene({ update: dropdownMenuPage.update, view: (model, h) => dropdownMenuPage.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.role('heading', { name: 'Dropdown menu' })).toExist(),
      Scene.keydown(Scene.role('button', { name: 'Actions' }), 'ArrowDown'),
      Scene.Mount.resolve(UiMenu.AnchorMenu, UiMenu.Message.CompletedAnchorMenu()),
      Scene.Mount.resolve(UiMenu.PortalMenuBackdrop, UiMenu.Message.CompletedPortalMenuBackdrop()),
      Scene.Command.resolve(UiMenu.FocusItems, UiMenu.Message.CompletedFocusItems()),
      Scene.click(Scene.role('menuitem', { name: 'Edit' })),
      Scene.Command.resolve(UiMenu.FocusButton, UiMenu.Message.CompletedFocusButton()),
      Scene.Mount.expectEnded(UiMenu.PortalMenuBackdrop),
      Scene.Mount.expectEnded(UiMenu.AnchorMenu),
      Scene.expect(Scene.text('Selected: Edit')).toExist())
  })

  it('changes the selected tab accessibly', () => {
    const initial = tabsPage.init()
    Scene.scene({ update: tabsPage.update, view: (model, h) => tabsPage.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.selector('#gallery-tabs-tab-0')).toHaveAttr('role', 'tab'),
      Scene.expect(Scene.selector('#gallery-tabs-tab-0')).toHaveAttr('aria-selected', 'true'),
      Scene.expect(Scene.text('Gallery revision r1')).toExist(),
      Scene.click(Scene.selector('#gallery-tabs-tab-1')),
      Scene.Command.resolve(UiTabs.FocusTab, UiTabs.Message.CompletedFocusTab()),
      Scene.expect(Scene.selector('#gallery-tabs-tab-1')).toHaveAttr('aria-selected', 'true'),
      Scene.expect(Scene.role('tabpanel')).toExist())
  })

  it('emits each theme setting change, renders its attributes, and opens the theme dialog', () => {
    const initial = themePage.init()
    const update = (model: { page: typeof initial.model; inputs: PageInputs }, message: typeof themePage.Message.Type) => {
      const result = themePage.update(model.page, message)
      const out = result.outMessage
      const nextModel = {
        page: result.model,
        inputs: out?._tag === 'ChangedThemeSetting'
          ? { ...model.inputs, [out.setting]: out.value } as PageInputs
          : model.inputs,
      }
      return { ...result, model: nextModel }
    }
    Scene.scene(
      { update, view: (model, h) => themePage.view(model.page, model.inputs, h) },
      Scene.given({ page: initial.model, inputs }),
      Scene.expect(Scene.role('heading', { name: 'Theme settings' })).toExist(),
      Scene.click(Scene.role('button', { name: 'Accent color' })),
      Scene.expect(Scene.selector('#theme-preview')).toHaveAttr('data-accent-color', 'crimson'),
      Scene.click(Scene.role('button', { name: 'Gray color' })),
      Scene.expect(Scene.selector('#theme-preview')).toHaveAttr('data-gray-color', 'gray'),
      Scene.click(Scene.role('button', { name: 'Radius' })),
      Scene.expect(Scene.selector('#theme-preview')).toHaveAttr('data-radius', 'large'),
      Scene.click(Scene.role('button', { name: 'Scaling' })),
      Scene.expect(Scene.selector('#theme-preview')).toHaveAttr('data-scaling', '105%'),
      Scene.click(Scene.role('button', { name: 'Appearance' })),
      Scene.expect(Scene.selector('#theme-preview')).toHaveAttr('class', 'radix-themes dark'),
      Scene.click(Scene.role('button', { name: 'Panel background' })),
      Scene.expect(Scene.selector('#theme-preview')).toHaveAttr('data-panel-background', 'solid'),
      Scene.click(Scene.role('button', { name: 'Open theme settings' })),
      Scene.Command.resolve(UiDialog.ShowDialog, UiDialog.Message.SucceededShowDialog()),
      Scene.Mount.resolve(UiDialog.AcquireResources, UiDialog.Message.SucceededAcquireResources()),
      Scene.expect(Scene.role('dialog', { name: 'Theme settings' })).toExist(),
    )
    expect(themePage.update(initial.model, { _tag: 'ChangeAccent' } as typeof themePage.Message.Type).outMessage).toEqual(
      PageOutMessage.ChangedThemeSetting({ setting: 'accentColor', value: 'crimson' }),
    )
    expect(themePage.update(initial.model, { _tag: 'ChangeGray' } as typeof themePage.Message.Type).outMessage).toEqual(
      PageOutMessage.ChangedThemeSetting({ setting: 'grayColor', value: 'gray' }),
    )
    expect(themePage.update(initial.model, { _tag: 'ChangeRadius' } as typeof themePage.Message.Type).outMessage).toEqual(
      PageOutMessage.ChangedThemeSetting({ setting: 'radius', value: 'large' }),
    )
    expect(themePage.update(initial.model, { _tag: 'ChangeScaling' } as typeof themePage.Message.Type).outMessage).toEqual(
      PageOutMessage.ChangedThemeSetting({ setting: 'scaling', value: '105%' }),
    )
    expect(themePage.update(initial.model, { _tag: 'ChangeAppearance' } as typeof themePage.Message.Type).outMessage).toEqual(
      PageOutMessage.ChangedThemeSetting({ setting: 'appearance', value: 'dark' }),
    )
    expect(themePage.update(initial.model, { _tag: 'ChangePanelBackground' } as typeof themePage.Message.Type).outMessage).toEqual(
      PageOutMessage.ChangedThemeSetting({ setting: 'panelBackground', value: 'solid' }),
    )
  })

  it('renders the shared date and optional note and exposes the date-shift and add-note actions', () => {
    const initial = sharedAPage.init()
    Scene.scene({ update: sharedAPage.update, view: (model, h) => sharedAPage.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.selector('#date-page-sharedA')).toExist(),
      Scene.expect(Scene.text('2026-10-19')).toExist(),
      Scene.expect(Scene.selector('#sharedA-note')).toExist(),
      Scene.expect(Scene.text('(none)')).toExist(),
      Scene.click(Scene.selector('#sharedA-prev')),
      Scene.click(Scene.selector('#sharedA-add-note')),
      Scene.expect(Scene.text('A shared note')).toExist())
    const result = sharedAPage.update(initial.model, { _tag: 'PreviousDay' } as typeof sharedAPage.Message.Type)
    expect(result.outMessage).toEqual(PageOutMessage.RequestedShiftDay({ days: -1 }))
  })

  it('renders the shared date on the second page', () => {
    const initial = sharedBPage.init()
    Scene.scene({ update: sharedBPage.update, view: (model, h) => sharedBPage.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.selector('#date-page-sharedB')).toExist(),
      Scene.expect(Scene.text('2026-10-19')).toExist())
    expect(sharedBPage.update(initial.model, { _tag: 'Tick' } as typeof sharedBPage.Message.Type).model).toEqual({ initCount: 2 })
  })
})
