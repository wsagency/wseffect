import * as Scene from 'foldkit/scene'
import * as UiListbox from '@foldkit/ui/listbox'
import { describe, it } from 'vitest'
import type { PageInputs } from '../src/contract.js'
import { page as selectPage } from '../src/components/select.js'
import { page as rangeSliderPage } from '../src/components/rangeSlider.js'

const inputs: PageInputs = { path: '/components/select', date: '2026-10-22', accentColor: 'indigo', grayColor: 'slate', radius: 'medium', scaling: '100%', appearance: 'inherit', panelBackground: 'translucent' }

describe('Gallery lane 2A Select and range slider pages', () => {
  it('opens the 1k-option select from the keyboard and chooses a value accessibly', () => {
    const initial = selectPage.init()
    Scene.scene({ update: selectPage.update, view: (model, h) => selectPage.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.role('heading', { name: 'Select' })).toExist(),
      Scene.expect(Scene.selector('[data-perf="select-open"]')).toExist(),
      Scene.keydown(Scene.role('combobox', { name: 'Gallery color' }), 'ArrowDown'),
      Scene.Command.resolve(UiListbox.FocusItems, UiListbox.Message.CompletedFocusItems()),
      Scene.Mount.resolve(UiListbox.AnchorListbox, UiListbox.Message.CompletedAnchorListbox()),
      Scene.Mount.resolve(UiListbox.PortalListboxBackdrop, UiListbox.Message.CompletedPortalListboxBackdrop()),
      Scene.expect(Scene.selector('[data-perf="select-choose"]')).toExist(),
      Scene.expect(Scene.role('option', { name: 'Indigo' })).toExist(),
      Scene.expect(Scene.role('option', { name: 'Blue' })).toExist(),
      Scene.click(Scene.role('option', { name: 'Blue' })),
      Scene.Command.resolve(UiListbox.FocusButton, UiListbox.Message.CompletedFocusButton()),
      Scene.Mount.expectEnded(UiListbox.PortalListboxBackdrop),
      Scene.Mount.expectEnded(UiListbox.AnchorListbox),
      Scene.expect(Scene.role('combobox', { name: 'Gallery color' })).toHaveText('Blue⌄'))
  })

  it('renders a two-thumb range with keyboard support and visual modifiers', () => {
    const initial = rangeSliderPage.init()
    Scene.scene({ update: rangeSliderPage.update, view: (model, h) => rangeSliderPage.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.role('heading', { name: 'Range slider' })).toExist(),
      Scene.expect(Scene.selector('[data-perf="slider-drag"]')).toExist(),
      Scene.expect(Scene.role('group', { name: 'horizontal range' })).toExist(),
      Scene.expect(Scene.role('slider', { name: 'Minimum value' })).toHaveAttr('value', '48'),
      Scene.expect(Scene.role('slider', { name: 'Maximum value' })).toHaveAttr('value', '72'),
      Scene.expect(Scene.selector('[data-perf="slider-drag"] .rt-SliderRoot[data-accent-color="indigo"]')).toExist(),
      Scene.focus(Scene.role('slider', { name: 'Minimum value' })),
      Scene.keydown(Scene.role('slider', { name: 'Minimum value' }), 'ArrowRight'),
      Scene.expect(Scene.role('slider', { name: 'Minimum value' })).toHaveAttr('value', '49'),
      Scene.focus(Scene.role('slider', { name: 'Maximum value' })),
      Scene.keydown(Scene.role('slider', { name: 'Maximum value' }), 'End'),
      Scene.expect(Scene.role('slider', { name: 'Maximum value' })).toHaveAttr('value', '100'))
  })
})
