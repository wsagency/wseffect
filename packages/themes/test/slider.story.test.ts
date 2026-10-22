import { Option } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { defineMessageUnion } from 'foldkit/message'
import { describe, expect, it } from 'vitest'
import * as Slider from '../src/components/slider.js'

const initConfig = { id: 'volume', min: 0, max: 100, step: 1 }
const Other = defineMessageUnion({ Tick: {} })
type Other = typeof Other.Type
const rangeConfig = { min: 0, max: 100, step: 5, orientation: 'horizontal' as const, thumbs: [{ id: 'low', value: 20 }, { id: 'high', value: 70 }] }

describe('Slider', () => {
  it('page keys move the controlled value by ten steps', () => {
    const model = Slider.init(initConfig)
    const result = Slider.update(model, Slider.Message.PressedKeyboardNavigation({ direction: 'PageIncrement', value: 25 }))
    expect(result.outMessage).toEqual(Slider.OutMessage.ChangedValue({ value: 35 }))
  })

  it('range slider preserves ordered controlled values', () => {
    const config = { min: 0, max: 100, step: 5, orientation: 'horizontal' as const, thumbs: [{ id: 'low', value: 20 }, { id: 'high', value: 70 }] }
    const model = Slider.Range.init(config)
    const result = Slider.Range.update(model, config, { _tag: 'Step', id: 'low', delta: 1 })
    expect(result.outMessage).toEqual({ _tag: 'ValuesChanged', thumbs: [{ id: 'low', value: 25 }, { id: 'high', value: 70 }] })
  })
  it('steps the range from a non-zero origin on its step grid', () => {
    const config = { min: 5, max: 55, step: 10, orientation: 'horizontal' as const, thumbs: [{ id: 'low', value: 5 }, { id: 'high', value: 45 }] }
    const result = Slider.Range.update(Slider.Range.init(config), config, { _tag: 'Step', id: 'low', delta: 1 })
    expect(result.outMessage).toEqual({ _tag: 'ValuesChanged', thumbs: [{ id: 'low', value: 15 }, { id: 'high', value: 45 }] })
  })
  it('builds the single-value parent fold adapter', () => {
    const fold = Slider.fold<{ slider: Slider.Model }, Other, never>({
      read: parent => Option.some(parent.slider),
      write: (parent, slider) => ({ ...parent, slider }),
      toParentMessage: () => Other.Tick(),
      foldOutMessage: () => model => ({ model }),
    })
    expect(fold).toBeDefined()
  })
  it('embeds the single-value slider under its parent slot', () => {
    const view = (model: Slider.Model, h: HtmlBuilder<Slider.Message | Other>) => Slider.embed(h, {
      slotId: 'volume-slider',
      model,
      toParentMessage: () => Other.Tick(),
      viewInputs: { value: 40, ariaLabel: 'Volume', orientation: 'Horizontal' },
    })
    const update = (model: Slider.Model, message: Slider.Message | Other) => message._tag === 'Tick' ? { model } : Slider.update(model, message)
    Scene.scene({ update, view }, Scene.given(Slider.init(initConfig)), Scene.expect(Scene.role('slider', { name: 'Volume' })).toExist())
  })
  it('folds and embeds the range slider lifecycle', () => {
    const fold = Slider.Range.fold<{ range: Slider.RangeModel }, Other, never>({
      read: parent => Option.some(parent.range),
      write: (parent, range) => ({ ...parent, range }),
      toParentMessage: () => Other.Tick(),
      foldOutMessage: () => model => ({ model }),
    })
    const parent = { range: Slider.Range.init(rangeConfig) }
    expect(fold(parent, { config: rangeConfig, message: { _tag: 'Step', id: 'low', delta: 1 } })).toBeDefined()
    const view = (model: Slider.RangeModel, h: HtmlBuilder<Slider.RangeMessage | Other>) => Slider.Range.embed(h, {
      slotId: 'volume-range',
      model,
      toParentMessage: () => Other.Tick(),
      viewInputs: rangeConfig,
    })
    const update = (model: Slider.RangeModel, message: Slider.RangeMessage | Other) => message._tag === 'Tick' ? { model } : Slider.Range.update(model, rangeConfig, message)
    Scene.scene({ update, view }, Scene.given(parent.range), Scene.expect(Scene.role('slider')).toExist())
  })
})
