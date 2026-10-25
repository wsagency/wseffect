import { Option } from 'effect'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Listbox from '@wsagency/wseffect-foldkit-ui/listbox'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, it } from 'vitest'
import * as Select from '../src/components/select.js'

const SelectBox = Select.create<'one'>()
const config: Select.Config<'one'> = { id: 'fruit', selectedValue: Option.some('one'), position: 'item-aligned', items: [{ value: 'one', textValue: 'One', isDisabled: false, content: null }], isModal: false }
const update = (model: Select.Model, message: Select.Message | undefined) => message === undefined ? { model } : SelectBox.update(model, message)
const view = (model: Select.Model, h: HtmlBuilder<Select.Message | undefined>) => SelectBox.view(model, { ...config, items: [{ value: 'one', textValue: 'One', isDisabled: false, content: h.span([], ['One']) }] }, h as HtmlBuilder<Select.Message>)

describe('Select item-aligned positioning', () => {
  it('mounts positioning with the open listbox and ends it when the listbox closes', () => Scene.scene(
    { update, view },
    Scene.given(SelectBox.init(config)),
    Scene.click(Scene.role('combobox', { name: 'fruit' })),
    Scene.Command.resolve(Listbox.FocusItems, Listbox.Message.CompletedFocusItems()),
    Scene.Mount.expectHas({ name: 'SelectPosition' }),
    Scene.Mount.resolve({ name: 'SelectPosition' }, undefined as never),
    Scene.keydown(Scene.role('listbox', { name: 'fruit' }), 'Escape'),
    Scene.Command.resolve(Listbox.FocusButton, Listbox.Message.CompletedFocusButton()),
    Scene.Mount.expectEnded({ name: 'SelectPosition' }),
  ))
})
