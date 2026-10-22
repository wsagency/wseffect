import '@wsagency/wseffect-themes/css/select.css'
import { Option, Schema } from 'effect'
import { Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as Select from '@wsagency/wseffect-themes/components/select'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, PageOutMessage, type PageInputs } from '../contract.js'
import { renderCaptureView } from '../captureView.js'
import type { HtmlBuilder } from 'foldkit/html'
import type { CaptureRequest } from '../capture.js'
 

const Picker = Select.create<string>()
const options = Array.from({ length: 1000 }, (_, index) => {
  const label = index === 0 ? 'Indigo' : index === 1 ? 'Blue' : `Color ${String(index + 1).padStart(4, '0')}`
  return { value: index === 0 ? 'indigo' : index === 1 ? 'blue' : `color-${index + 1}`, textValue: label, isDisabled: false, label }
})
const captureOptions = options.slice(0, 2)
const itemsByBuilder = new WeakMap<object, ReadonlyArray<Select.Item<string>>>()
const captureItemsByBuilder = new WeakMap<object, ReadonlyArray<Select.Item<string>>>()
const makeItems = <M>(h: HtmlBuilder<M>, source: ReadonlyArray<typeof options[number]>): ReadonlyArray<Select.Item<string>> =>
  source.map((item, index) => ({
    value: item.value,
    textValue: item.textValue,
    isDisabled: item.isDisabled,
    content: h.span(index === 1 ? [h.DataAttribute('perf', 'select-choose')] : [], [item.label]),
  }))
const itemsFor = <M>(h: HtmlBuilder<M>): ReadonlyArray<Select.Item<string>> => {
  const cached = itemsByBuilder.get(h)
  if (cached !== undefined) return cached
  const items = makeItems(h, options)
  itemsByBuilder.set(h, items)
  return items
}
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

export const Model = Schema.Struct({ select: Picker.Model, selectedValue: Schema.Option(Schema.String) })
export const Message = defineMessageUnion({ SelectEvent: { message: Picker.Message } })
type Model = typeof Model.Type
type Message = typeof Message.Type
const foldSelect = Picker.fold<Model, Message, typeof PageOutMessage.Type>({ read: model => Option.some(model.select), write: (model, select) => ({ ...model, select }), toParentMessage: message => Message.SelectEvent({ message }), foldOutMessage: outMessage => model => ({ model: { ...model, selectedValue: Option.some(outMessage.value) } }) })

export const page = galleryPageContract.definePage({
  Model, Message,
  init: () => ({ model: { select: Picker.init(selectConfig(Option.some('indigo'), [])), selectedValue: Option.some('indigo') } }),
  update: (model: Model, message: Message) => Message.match(message, {
    SelectEvent: ({ message: child }) => foldSelect(model, child),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => h.div([], [
    Heading.view({ as: 'h1' }, ['Select'], h),
    h.div([h.DataAttribute('perf', 'select-open')], [Picker.embed(h, { slotId: 'gallery-select', model: model.select, toParentMessage: message => Message.SelectEvent({ message }), viewInputs: selectConfig(model.selectedValue, itemsFor(h)) })]),
  ])),
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
