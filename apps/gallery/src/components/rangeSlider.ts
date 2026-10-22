import '@wsagency/wseffect-themes/css/slider.css'
import { Option, Schema } from 'effect'
import { Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Range as SliderRange } from '@wsagency/wseffect-themes/components/slider/range'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, PageOutMessage, type PageInputs } from '../contract.js'

const pageThumbs = [{ id: 'Minimum value', value: 48 }, { id: 'Maximum value', value: 72 }]
const rangeConfig = (thumbs: ReadonlyArray<{ id: string; value: number }>) => ({ min: 0, max: 100, step: 1, orientation: 'horizontal' as const, thumbs, props: { size: '2' as const, variant: 'surface' as const, color: 'indigo' as const } })
export const Model = Schema.Struct({ range: SliderRange.Model, thumbs: Schema.Array(Schema.Struct({ id: Schema.String, value: Schema.Number })) })
export const Message = defineMessageUnion({ RangeEvent: { message: SliderRange.Message } })
type Model = typeof Model.Type
type Message = typeof Message.Type
const foldRange = SliderRange.fold<Model, Message, typeof PageOutMessage.Type>({
  read: model => Option.some(model.range),
  write: (model, range) => ({ ...model, range }),
  toParentMessage: message => Message.RangeEvent({ message }),
  foldOutMessage: outMessage => model => ({ model: { ...model, thumbs: [...outMessage.thumbs] } }),
})

export const page = galleryPageContract.definePage({
  Model, Message,
  init: () => ({ model: { range: SliderRange.init(rangeConfig(pageThumbs)), thumbs: pageThumbs } }),
  update: (model: Model, message: Message) => Message.match(message, {
    RangeEvent: ({ message: child }) => foldRange(model, { config: rangeConfig([...model.thumbs]), message: child }),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => h.div([], [
    Heading.view({ as: 'h1' }, ['Range slider'], h),
    h.div([h.DataAttribute('perf', 'slider-drag')], [SliderRange.embed(h, { slotId: 'gallery-range-slider', model: model.range, toParentMessage: message => Message.RangeEvent({ message }), viewInputs: rangeConfig([...model.thumbs]) })]),
    h.p([], ['Use the arrow keys to adjust either value; Home and End move to the bounds.']),
  ])),
})
