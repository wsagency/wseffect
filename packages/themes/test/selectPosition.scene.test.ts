import { Option } from 'effect'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Listbox from '@wsagency/wseffect-foldkit-ui/listbox'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, it } from 'vitest'
import * as Select from '../src/components/select.js'

const SelectBox = Select.create<'one'>()
const config: Select.Config<'one'> = {
  id: 'fruit',
  selectedValue: Option.some('one'),
  position: 'item-aligned',
  items: [{ value: 'one', textValue: 'One', isDisabled: false, content: null }],
  isModal: false,
}
const update = (model: Select.Model, message: Select.Message | undefined) =>
  message === undefined ? { model } : SelectBox.update(model, message)
const view = (model: Select.Model, h: HtmlBuilder<Select.Message | undefined>) =>
  SelectBox.view(model, {
    ...config,
    items: [{ value: 'one', textValue: 'One', isDisabled: false, content: h.span([], ['One']) }],
  }, h as HtmlBuilder<Select.Message>)

const anchor = (selectedItemId?: string) => Listbox.AnchorListbox({
  buttonId: 'fruit-button',
  anchor: { placement: 'bottom-start', gap: 4 },
  anchorMode: 'SelectedOrActiveItem',
  ...(selectedItemId === undefined ? {} : { selectedItemId }),
})

describe('Select item-aligned positioning', () => {
  it('anchors to the selected item when no option is active and releases mounts on close', () => Scene.scene(
    { update, view },
    Scene.given(SelectBox.init(config)),
    Scene.click(Scene.role('combobox', { name: 'fruit' })),
    Scene.Command.resolve(Listbox.FocusItems, Listbox.Message.CompletedFocusItems()),
    Scene.Mount.expectHas(anchor('fruit-item-0')),
    Scene.Mount.resolve(Listbox.AnchorListbox, Listbox.Message.CompletedAnchorListbox()),
    Scene.Mount.resolve(Listbox.PortalListboxBackdrop, Listbox.Message.CompletedPortalListboxBackdrop()),
    Scene.Mount.resolve({ name: 'ScrollAreaSync' }, Listbox.Message.CompletedPortalListboxBackdrop()),
    Scene.click(Scene.role('combobox', { name: 'fruit' })),
    Scene.Command.resolve(Listbox.FocusButton, Listbox.Message.CompletedFocusButton()),
    Scene.Mount.expectEnded(Listbox.AnchorListbox, Listbox.PortalListboxBackdrop),
    Scene.Mount.expectEnded({ name: 'ScrollAreaSync' }),
  ))

  it('falls back to the trigger when there is neither an active nor a selected item', () => Scene.scene(
    { update, view: (model, h) => SelectBox.view(model, { ...config, selectedValue: Option.none() }, h as HtmlBuilder<Select.Message>) },
    Scene.given(SelectBox.init({ ...config, selectedValue: Option.none() })),
    Scene.click(Scene.role('combobox', { name: 'fruit' })),
    Scene.Command.resolve(Listbox.FocusItems, Listbox.Message.CompletedFocusItems()),
    Scene.Mount.expectHas(anchor()),
    Scene.Mount.resolve(Listbox.AnchorListbox, Listbox.Message.CompletedAnchorListbox()),
    Scene.Mount.resolve(Listbox.PortalListboxBackdrop, Listbox.Message.CompletedPortalListboxBackdrop()),
    Scene.Mount.resolve({ name: 'ScrollAreaSync' }, Listbox.Message.CompletedPortalListboxBackdrop()),
    Scene.click(Scene.role('combobox', { name: 'fruit' })),
    Scene.Command.resolve(Listbox.FocusButton, Listbox.Message.CompletedFocusButton()),
    Scene.Mount.expectEnded(Listbox.AnchorListbox, Listbox.PortalListboxBackdrop),
    Scene.Mount.expectEnded({ name: 'ScrollAreaSync' }),
  ))
  it('anchors to the active item before a different selected item', () => {
    const activeConfig: Select.Config<'one' | 'two'> = {
      ...config,
      selectedValue: Option.some('one'),
      items: [
        { value: 'one', textValue: 'One', isDisabled: false, content: null },
        { value: 'two', textValue: 'Two', isDisabled: false, content: null },
      ],
    }
    const ActiveSelect = Select.create<'one' | 'two'>()
    const activeView = (model: Select.Model, h: HtmlBuilder<Select.Message | undefined>) =>
      ActiveSelect.view(model, activeConfig, h as HtmlBuilder<Select.Message>)
    const model = {
      ...ActiveSelect.init(activeConfig),
      isOpen: true,
      maybeActiveItemIndex: Option.some(1),
    }
    Scene.scene(
      { update: (state: Select.Model, message: Select.Message | undefined) =>
        message === undefined ? { model: state } : ActiveSelect.update(state, message), view: activeView },
      Scene.given(model),
      Scene.Mount.expectHas(anchor('fruit-item-1')),
      Scene.Mount.resolve(Listbox.AnchorListbox, Listbox.Message.CompletedAnchorListbox()),
      Scene.Mount.resolve(Listbox.PortalListboxBackdrop, Listbox.Message.CompletedPortalListboxBackdrop()),
      Scene.Mount.resolve({ name: 'ScrollAreaSync' }, Listbox.Message.CompletedPortalListboxBackdrop()),
    )
  })
})
