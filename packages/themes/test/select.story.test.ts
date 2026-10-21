import { Option } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import * as Listbox from '@foldkit/ui/listbox'
import * as Scene from 'foldkit/scene'
import { defineMessageUnion } from 'foldkit/message'
import { describe, it } from 'vitest'
import * as Select from '../src/components/select.js'

const SelectBox = Select.create<'one' | 'two' | 'three'>()
const Other = defineMessageUnion({ Tick: {} })
type Other = typeof Other.Type
const update = (model: Select.Model, message: Select.Message | Other) => message._tag === 'Tick' ? { model } : SelectBox.update(model, message)
const view = (model: Select.Model, h: HtmlBuilder<Select.Message | Other>) => SelectBox.view(model, {
  id: 'choice',
  selectedValue: Option.none(),
  position: 'item-aligned',
  items: [
    { id: 'group', label: h.span([], ['Group']), items: [{ value: 'one', textValue: 'One', isDisabled: false, content: h.span([], ['One']) }, { kind: 'separator', id: 'divider' }, { value: 'two', textValue: 'Two', isDisabled: true, content: h.span([], ['Two']) }] },
    { value: 'three', textValue: 'Three', isDisabled: false, content: h.span([], ['Three']) },
  ],
  isModal: false,
}, h as HtmlBuilder<Select.Message>)

describe('Select', () => {
  it('supports groups, separators, disabled options and typeahead in item-aligned placement', () => Scene.scene(
    { update, view },
    Scene.given(SelectBox.init({ id: 'choice', selectedValue: Option.none(), position: 'item-aligned', items: [], isModal: false })),
    Scene.click(Scene.selector('[role="combobox"]')),
    Scene.Command.resolve(Listbox.FocusItems, Listbox.Message.CompletedFocusItems()),
    Scene.expect(Scene.role('listbox', { name: 'choice' })).toExist(),
    Scene.keydown(Scene.role('listbox', { name: 'choice' }), 't'),
    Scene.Command.resolve(Listbox.ScrollIntoView, Listbox.Message.CompletedScrollIntoView()),
    Scene.expect(Scene.selector('#choice-option-three')).toHaveAttr('data-active', 'true'),
  ))
})
