import '@wsagency/wseffect-themes/styles.css'
import { Option } from 'effect'
import { makeElement, run } from '@wsagency/wseffect-foldkit/runtime'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Select from '@wsagency/wseffect-themes/components/select'
document.body.classList.add('radix-themes')

const SelectBox = Select.create<Value>()
type Value = string
const params = new URLSearchParams(location.search)
const position = params.get('position') === 'popper' ? 'popper' : 'item-aligned'
const geometry = params.get('geometry')
const longList = geometry !== null
const longItems = Array.from({ length: 50 }, (_, index) => {
  const value = `item-${index}`
  return { value, textValue: `Item ${index}`, isDisabled: false, content: null }
})
let selectedValue: Option.Option<Value> = Option.some(longList ? 'item-35' : 'red')
if (geometry !== null) {
  const style = document.createElement('style')
  style.textContent = `#choice-button { position: fixed; top: ${geometry === 'bottom' ? '740px' : '24px'}; }`
  document.head.append(style)
}
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
  items: longList
    ? longItems.map(item => ({
        ...item,
        content: h.span([], [`Item ${item.value.slice(5)}`]),
      }))
    : [
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
