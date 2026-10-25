import { Schema } from 'effect'
import { makeElement, run } from '@wsagency/wseffect-foldkit/runtime'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as RangeSlider from '@wsagency/wseffect-primitives/range-slider'

const initialThumbs = [{ id: 'low', value: 25 }, { id: 'high', value: 75 }]
const baseConfig = { min: 0, max: 100, step: 1, orientation: 'horizontal' as const }
const Model = Schema.Struct({
  slider: RangeSlider.Model,
  thumbs: Schema.Array(Schema.Struct({ id: Schema.String, value: Schema.Number })),
})
type Model = typeof Model.Type

const publishValues = (thumbs: ReadonlyArray<RangeSlider.Thumb>) => {
  ;(window as Window & { __thumbs?: ReadonlyArray<number> }).__thumbs = thumbs.map(thumb => thumb.value)
}

const application = makeElement({
  Model,
  init: () => {
    publishValues(initialThumbs)
    const config = { ...baseConfig, thumbs: initialThumbs }
    return { model: { slider: RangeSlider.init(config), thumbs: initialThumbs } }
  },
  update: (model: Model, message: RangeSlider.Message) => {
    const config = { ...baseConfig, thumbs: model.thumbs }
    const result = RangeSlider.update(model.slider, config, message)
    const thumbs = result.outMessage?._tag === 'ValuesChanged' ? result.outMessage.thumbs : model.thumbs
    publishValues(thumbs)
    return { model: { slider: result.model, thumbs } }
  },
  view: (model: Model, h: HtmlBuilder<RangeSlider.Message>) => h.div([
    h.Id('slider'),
  ], [RangeSlider.view(model.slider, { ...baseConfig, thumbs: model.thumbs }, h)]),
  container: document.getElementById('app'),
})
run(application)
