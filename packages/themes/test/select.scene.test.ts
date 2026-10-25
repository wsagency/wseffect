import { Option } from 'effect'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import { describe, it } from 'vitest'
import * as Select from '../src/components/select.js'
const SelectBox = Select.create<'one'>()
const Other = defineMessageUnion({ Tick: {} })
type Other = typeof Other.Type
const update = (model: Select.Model, message: Select.Message | Other) => message._tag === 'Tick' ? { model } : SelectBox.update(model, message)
const view = (model: Select.Model, h: HtmlBuilder<Select.Message | Other>) => SelectBox.view(model, { id: 'fruit', selectedValue: Option.some('one'), position: 'item-aligned', items: [{ value: 'one', textValue: 'One', isDisabled: false, content: h.span([], ['One']) }], isModal: false }, h as HtmlBuilder<Select.Message>)
describe('Select', () => {
  it('renders the selected value in a labelled combobox trigger', () => Scene.scene({ update, view }, Scene.given(SelectBox.init({ id: 'fruit', selectedValue: Option.some('one'), position: 'item-aligned', items: [], isModal: false })), Scene.expect(Scene.role('combobox', { name: 'fruit' })).toExist()))
})
