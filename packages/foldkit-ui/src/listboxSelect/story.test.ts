import { Option, Schema } from 'effect'
import * as Listbox from '../listbox/public.js'
import { expect, it } from 'vitest'
import * as Select from './index.js'

const bundle = Select.createSelect<'red' | 'blue'>()
const items: ReadonlyArray<Select.SelectItem<'red' | 'blue'>> = [
  { value: 'red', textValue: 'Red', isDisabled: false, content: 'Red' },
  { value: 'blue', textValue: 'Blue', isDisabled: false, content: 'Blue' },
]
const config: Select.Config<'red' | 'blue'> = {
  id: 'colors', selectedValue: Option.none(), items, position: 'item-aligned', isModal: false,
}

it('keeps value parent-owned', () => {
  const model = bundle.init(config)
  const result = bundle.update(model, Listbox.Message.SelectedItem({ item: 'red' }))
  expect(result.model).not.toHaveProperty('selectedValue')
  expect(result.outMessage).toMatchObject({ _tag: 'Selected', value: 'red' })
})

it('selects item-aligned anchoring from the position config', () => {
  expect(bundle.init(config).anchorMode).toBe('SelectedOrActiveItem')
  expect(bundle.init({ ...config, position: 'popper' }).anchorMode).toBe('Trigger')
})

it('Model and Message schemas round-trip through the APP-8 page-model codec', () => {
  const model = bundle.init(config)
  const encoded = Schema.encodeSync(Select.SelectModel)(model)
  expect(Schema.decodeUnknownSync(Select.SelectModel)(encoded)).toEqual(model)
  const message = Listbox.Message.SelectedItem({ item: 'red' })
  const encodedMessage = Schema.encodeSync(Select.SelectMessage)(message)
  expect(Schema.decodeUnknownSync(Select.SelectMessage)(encodedMessage)).toEqual(message)
})
