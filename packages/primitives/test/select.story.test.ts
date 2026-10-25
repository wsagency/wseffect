import { Option, Schema } from 'effect'
import * as Listbox from '@wsagency/wseffect-foldkit-ui/listbox'
import { expect, it } from 'vitest'
import * as Select from '../src/select.js'

const bundle = Select.createSelect<'red' | 'blue'>()
const items: ReadonlyArray<Select.SelectItem<'red' | 'blue'>> = [
  { value: 'red', textValue: 'Red', isDisabled: false, content: null },
  { value: 'blue', textValue: 'Blue', isDisabled: false, content: null },
]
const config: Select.SelectConfig<'red' | 'blue'> = {
  id: 'colors', selectedValue: Option.none(), items, position: 'item-aligned', isModal: false,
}

it('keeps value parent-owned', () => {
  const model = bundle.init(config)
  const result = bundle.update(model, Listbox.Message.SelectedItem({ item: 'red' }))
  expect(result.model).not.toHaveProperty('selectedValue')
  expect(result.outMessage).toMatchObject({ _tag: 'Selected', value: 'red' })
})

it('item-aligned positions active item', () => {
  const itemConfig: Select.SelectConfig<'red' | 'blue'> = {
    ...config, selectedValue: Option.some('red'), position: 'item-aligned',
  }
  expect(bundle.init(itemConfig).id).toBe('colors')
})

it('skips disabled and separator options during typeahead', () => {
  const grouped: Select.SelectConfig<'red' | 'blue'> = {
    ...config,
    items: [
      { id: 'warm', label: null, items: [{ value: 'red', textValue: 'Red', isDisabled: true, content: null }, { kind: 'separator', id: 'line' }, { value: 'blue', textValue: 'Blue', isDisabled: false, content: null }] },
    ],
  }
  expect(bundle.init(grouped).isOpen).toBe(false)
})

it('Model and Message schemas round-trip through the APP-8 page-model codec', () => {
  const model = bundle.init(config)
  const encoded = Schema.encodeSync(Select.SelectModel)(model)
  expect(Schema.decodeUnknownSync(Select.SelectModel)(encoded)).toEqual(model)
  const message = Listbox.Message.SelectedItem({ item: 'red' })
  const encodedMessage = Schema.encodeSync(Select.SelectMessage)(message)
  expect(Schema.decodeUnknownSync(Select.SelectMessage)(encodedMessage)).toEqual(message)
})
