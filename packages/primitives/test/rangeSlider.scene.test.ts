import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { it } from 'vitest'
import * as RangeSlider from '../src/range-slider.js'

const config: RangeSlider.Config = {
  min: 0, max: 100, step: 1, orientation: 'horizontal',
  thumbs: [{ id: 'low', value: 25 }, { id: 'high', value: 75 }],
}
const update = (model: RangeSlider.Model, message: RangeSlider.Message) => RangeSlider.update(model, config, message)
const render = (model: RangeSlider.Model, h: HtmlBuilder<RangeSlider.Message>) => RangeSlider.view(model, config, h)

it('one accessible slider per thumb', () => {
  Scene.scene(
    { update, view: render },
    Scene.given(RangeSlider.init(config)),
    Scene.expect(Scene.role('slider', { name: 'low' })).toHaveAttr('value', '25'),
    Scene.expect(Scene.role('slider', { name: 'high' })).toHaveAttr('value', '75'),
  )
})
