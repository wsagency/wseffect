import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as UiDialog from '@foldkit/ui/dialog'
import * as AlertDialog from '@wsagency/wseffect-themes/components/alert-dialog'
import * as HoverCard from '@wsagency/wseffect-themes/components/hover-card'
import * as UiPopover from '@foldkit/ui/popover'
import * as UiTooltip from '@foldkit/ui/tooltip'
import * as UiMenu from '@foldkit/ui/menu'
import type { PageInputs } from '../src/contract.js'
import { page as alertDialogPage } from '../src/components/alertDialog.js'
import { page as popoverPage } from '../src/components/popover.js'
import { page as hoverCardPage } from '../src/components/hoverCard.js'
import { page as tooltipPage } from '../src/components/tooltip.js'
import { page as contextMenuPage } from '../src/components/contextMenu.js'
import { page as tabNavPage } from '../src/components/tabNav.js'

const inputs: PageInputs = {
  path: '/components/alert-dialog',
  date: '2026-10-22', accentColor: 'indigo', grayColor: 'slate', radius: 'medium',
  scaling: '100%', appearance: 'inherit', panelBackground: 'translucent',
}

describe('Gallery lane 2B pages', () => {
  it('renders and opens the alert dialog with click activation', () => {
    const initial = alertDialogPage.init()
    Scene.scene({ update: alertDialogPage.update, view: (model, h) => alertDialogPage.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.role('heading', { name: 'Alert dialog' })).toExist(),
      Scene.click(Scene.role('button', { name: 'Delete record' })),
      Scene.Command.resolve(UiDialog.ShowDialog, UiDialog.Message.SucceededShowDialog()),
      Scene.Mount.resolve({ name: 'PortalAlertDialog' }, AlertDialog.Message.CompletedCloseDialog()),
      Scene.Mount.resolve(UiDialog.AcquireResources, UiDialog.Message.SucceededAcquireResources()),
      Scene.expect(Scene.role('alertdialog', { name: 'Delete record?' })).toExist(),
      Scene.expect(Scene.text('This action cannot be undone.')).toExist())
  })

  it('renders the popover and opens it by clicking its accessible trigger', () => {
    const initial = popoverPage.init()
    Scene.scene({ update: popoverPage.update, view: (model, h) => popoverPage.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.role('heading', { name: 'Popover' })).toExist(),
      Scene.click(Scene.role('button', { name: 'Additional information' })),
      Scene.Mount.resolve(UiPopover.AnchorPopover, UiPopover.Message.CompletedAnchorPopover()),
      Scene.expect(Scene.role('button', { name: 'Additional information' })).toHaveAttr('aria-expanded', 'true'),
      Scene.expect(Scene.text('Popover content for comparison.')).toExist())
  })

  it('renders the hover-card trigger and open content', () => {
    const initial = hoverCardPage.init()
    Scene.scene({ update: hoverCardPage.update, view: (model, h) => hoverCardPage.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.role('heading', { name: 'Hover card' })).toExist(),
      Scene.focus(Scene.role('button', { name: '@radix' })),
      Scene.Mount.resolve({ name: 'AnchorHoverCard' }, HoverCard.Message.CompletedWaitBeforeClosing({ version: -1 })),
      Scene.expect(Scene.text('Radix2Solid profile card.')).toExist())
  })

  it('renders tooltip help when opened by keyboard focus', () => {
    const initial = tooltipPage.init()
    Scene.scene({ update: tooltipPage.update, view: (model, h) => tooltipPage.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.role('heading', { name: 'Tooltip' })).toExist(),
      Scene.focus(Scene.role('button', { name: 'Save changes help' })),
      Scene.Mount.resolve(UiTooltip.AnchorTooltip, UiTooltip.Message.CompletedAnchorTooltip()),
      Scene.expect(Scene.selector('[data-perf="tooltip-open"]')).toExist(),
      Scene.expect(Scene.selector('[data-perf="tooltip-close"]')).toExist(),
      Scene.expect(Scene.role('tooltip')).toExist(),
      Scene.expect(Scene.text('Save your changes')).toExist())
  })

  it('renders a context menu source and supports keyboard invocation', () => {
    const initial = contextMenuPage.init()
    Scene.scene({ update: contextMenuPage.update, view: (model, h) => contextMenuPage.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.role('heading', { name: 'Context menu' })).toExist(),
      Scene.expect(Scene.text('Right-click for actions')).toExist(),
      Scene.Mount.resolve({ name: 'ContextMenuSourceEvents' }, UiMenu.Message.IgnoredMouseClick()),
      Scene.focus(Scene.selector('#gallery-context-source')),
      Scene.keydown(Scene.selector('#gallery-context-source'), 'ContextMenu'),
      Scene.Mount.resolve({ name: 'ContextMenuAnchor' }, UiMenu.Message.CompletedAnchorMenu()),
      Scene.expect(Scene.role('menu')).toExist(),
      Scene.expect(Scene.role('menuitem', { name: 'Open' })).toExist())
  })

  it('renders labeled tab navigation with the current route link', () => {
    const initial = tabNavPage.init()
    Scene.scene({ update: tabNavPage.update, view: (model, h) => tabNavPage.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.role('heading', { name: 'Tab navigation' })).toExist(),
      Scene.expect(Scene.role('navigation', { name: 'Documentation' })).toExist(),
      Scene.expect(Scene.role('link')).toExist(),
      Scene.expect(Scene.selector('a[href="#overview"]')).toHaveAttr('aria-current', 'page'))
  })
})
