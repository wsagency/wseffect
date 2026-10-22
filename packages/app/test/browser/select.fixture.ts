import '@wsagency/wseffect-themes/styles.css'
import { Option } from 'effect'
import { makeElement, run } from 'foldkit/runtime'
import type { HtmlBuilder } from 'foldkit/html'
import * as Select from '@wsagency/wseffect-themes/components/select'
document.body.classList.add('radix-themes')

type Value = 'red' | 'blue' | 'green' | 'yellow'
const SelectBox = Select.create<Value>()
const position = new URLSearchParams(location.search).get('position') === 'popper' ? 'popper' : 'item-aligned'
let selectedValue = Option.some<Value>('red')
const initialConfig: Select.Config<Value> = {
  id: 'choice',
  selectedValue,
  position,
  props: { size: '3', variant: 'classic', color: 'blue', radius: 'large', highContrast: true },
  isModal: false,
  items: [],
}
const update = (model: Select.Model, message: Select.Message) => {
  const { outMessage, ...updateReturn } = SelectBox.update(model, message)
  if (outMessage?._tag === 'Selected') {
    selectedValue = Option.some(outMessage.value)
    ;(window as Window & { __selected?: string }).__selected = outMessage.value
  }
  return updateReturn
}
const view = (model: Select.Model, h: HtmlBuilder<Select.Message>) => SelectBox.view(model, {
  ...initialConfig,
  selectedValue,
  items: [
    {
      id: 'colors',
      label: h.span([], ['Warm Colors']),
      items: [
        { value: 'red', textValue: 'Red', isDisabled: false, content: h.span([], ['Red']) },
        { kind: 'separator', id: 'group-break' },
        { value: 'blue', textValue: 'Blue', isDisabled: false, content: h.span([], ['Blue']) },
        { value: 'green', textValue: 'Disabled green', isDisabled: true, content: h.span([], ['Disabled green']) },
      ],
    },
    { kind: 'separator', id: 'root-break' },
    { value: 'yellow', textValue: 'Yellow', isDisabled: false, content: h.span([], ['Yellow']) },
  ],
}, h)

const application = makeElement({
  Model: Select.Model,
  init: () => ({ model: SelectBox.init(initialConfig) }),
  update,
  view,
  container: document.getElementById('app'),
})
run(application)
