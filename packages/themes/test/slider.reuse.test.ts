import { createLazy, type HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import { describe, expect, it, vi } from 'vitest'
import * as Slider from '../src/components/slider.js'

const Other = defineMessageUnion({ Tick: {}, Resize: {} })
type Other = typeof Other.Type
const update = (model: Readonly<{ slider: Slider.Model; value: number }>, message: Other | Slider.Message) => message._tag === 'Tick'
  ? { model }
  : message._tag === 'Resize'
    ? { model: { ...model, value: 50 } }
    : { model: { ...model, slider: Slider.update(model.slider, message).model } }

describe('Slider view reuse', () => {
  it('unrelated update reuses view; changed argument re-executes once', () => {
    const lazy = createLazy()
    const render = vi.fn((value: number, h: HtmlBuilder<Other | Slider.Message>) => Slider.view(Slider.init({ id: 'reuse', min: 0, max: 100, step: 1 }), { value, ariaLabel: 'Volume' }, h as HtmlBuilder<Slider.Message>))
    const view = (model: Readonly<{ slider: Slider.Model; value: number }>, h: HtmlBuilder<Other | Slider.Message>) => h.div([], [lazy(render, [model.value, h]), h.button([h.OnClick({ _tag: 'Tick' })], ['tick']), h.button([h.OnClick({ _tag: 'Resize' })], ['resize'])])
    const slider = Slider.init({ id: 'reuse', min: 0, max: 100, step: 1 })
    Scene.scene({ update, view }, Scene.given({ slider, value: 20 }), Scene.click(Scene.role('button', { name: 'tick' })), Scene.click(Scene.role('button', { name: 'resize' })))
    expect(render).toHaveBeenCalledTimes(2)
  })
})
