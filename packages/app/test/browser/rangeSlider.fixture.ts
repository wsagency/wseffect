import { Schema } from 'effect'
import { makeElement, run } from '@wsagency/wseffect-foldkit/runtime'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Slider from '@wsagency/wseffect-foldkit-ui/slider'
import type { RangeMessage, RangeModel, RangeThumb } from '@wsagency/wseffect-foldkit-ui/slider'
const RangeSlider = Slider.Range

const initialThumbs = [{ id: 'low', value: 25 }, { id: 'high', value: 75 }]
const baseConfig = { min: 0, max: 100, step: 1, orientation: 'horizontal' as const }
const Model = Schema.Struct({
  slider: Slider.Range.Model,
  thumbs: Schema.Array(Schema.Struct({ id: Schema.String, value: Schema.Number })),
})
type Model = typeof Model.Type

const publishValues = (thumbs: ReadonlyArray<RangeThumb>) => {
  ;(window as Window & { __thumbs?: ReadonlyArray<number> }).__thumbs = thumbs.map(thumb => thumb.value)
}

const application = makeElement({
  Model,
  init: () => {
    publishValues(initialThumbs)
    const config = { ...baseConfig, thumbs: initialThumbs }
    return { model: { slider: RangeSlider.init(config), thumbs: initialThumbs } }
  },
  update: (model: Model, message: RangeMessage) => {
    const config = { ...baseConfig, thumbs: model.thumbs }
    const result = RangeSlider.update(model.slider, config, message)
    const thumbs = result.outMessage?._tag === 'ValuesChanged' ? result.outMessage.thumbs : model.thumbs
    publishValues(thumbs)
    return { model: { slider: result.model, thumbs } }
  },
  view: (model: Model, h: HtmlBuilder<RangeMessage>) => h.div([
    h.Id('slider'),
  ], [RangeSlider.view(model.slider, { ...baseConfig, thumbs: model.thumbs }, h)]),
  container: document.getElementById('app'),
})
run(application)
