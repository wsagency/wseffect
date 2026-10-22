import '@wsagency/wseffect-themes/css/select.css'
import { Option } from 'effect'
import * as Select from '@wsagency/wseffect-themes/components/select'
import { renderCaptureView } from '../captureView.js'
import type { HtmlBuilder } from 'foldkit/html'
import type { CaptureRequest } from '../capture.js'

const Picker = Select.create<string>()
const captureOptions = [
  { value: 'indigo', textValue: 'Indigo', isDisabled: false, label: 'Indigo' },
  { value: 'blue', textValue: 'Blue', isDisabled: false, label: 'Blue' },
]
const captureItemsByBuilder = new WeakMap<object, ReadonlyArray<Select.Item<string>>>()
const captureItemsFor = <M>(h: HtmlBuilder<M>): ReadonlyArray<Select.Item<string>> => {
  const cached = captureItemsByBuilder.get(h)
  if (cached !== undefined) return cached
  const items = captureOptions.map(item => ({
    value: item.value,
    textValue: item.textValue,
    isDisabled: item.isDisabled,
    content: item.label,
  }))
  captureItemsByBuilder.set(h, items)
  return items
}
const selectProps = { variant: 'surface' as const, contentVariant: 'solid' as const, placeholder: 'Choose a color' }
const selectConfig = (selectedValue: Option.Option<string>, items: ReadonlyArray<Select.Item<string>>, props: Select.Props = selectProps) => ({
  id: 'Gallery color', selectedValue, items, position: 'popper' as const, isModal: false as const, props,
})

export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  const { triggerVariant, open: _open, ...rest } = request.props
  const props = {
    ...selectProps,
    ...rest,
    variant: typeof triggerVariant === 'string' ? triggerVariant as Select.Props['variant'] : selectProps.variant,
  } as Select.Props
  renderCaptureView(root, request, h => {
    const config = selectConfig(Option.some('indigo'), captureItemsFor(h), props)
    const initialModel = Picker.init(config)
    const model = request.state === 'open'
      ? Picker.update(initialModel, Picker.Message.Opened({ maybeActiveItemIndex: Option.some(0) })).model
      : initialModel
    return Picker.view(
      model,
      config,
      h as unknown as HtmlBuilder<typeof Picker.Message.Type>,
    )
  })
}
