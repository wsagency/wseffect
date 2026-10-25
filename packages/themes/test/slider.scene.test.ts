import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import { describe, it } from 'vitest'
import * as Slider from '../src/components/slider.js'

const Other = defineMessageUnion({ Tick: {} })
type Other = typeof Other.Type
const update = (model: Slider.Model, message: Slider.Message | Other) => message._tag === 'Tick' ? { model } : Slider.update(model, message)
const view = (model: Slider.Model, h: HtmlBuilder<Slider.Message | Other>) => Slider.view(model, { value: 40, ariaLabel: 'Volume', orientation: 'Vertical' }, h as HtmlBuilder<Slider.Message>)

describe('Slider', () => {
  it('exposes its accessible name, min, max, and orientation', () => Scene.scene(
    { update, view },
    Scene.given(Slider.init({ id: 'volume', min: 20, max: 80, step: 5 })),
    Scene.expect(Scene.role('slider', { name: 'Volume' })).toHaveAttr('aria-valuemin', '20'),
    Scene.expect(Scene.role('slider', { name: 'Volume' })).toHaveAttr('aria-valuemax', '80'),
    Scene.expect(Scene.role('slider', { name: 'Volume' })).toHaveAttr('aria-orientation', 'vertical'),
  ))
})
