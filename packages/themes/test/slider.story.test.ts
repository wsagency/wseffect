import { describe, expect, it } from 'vitest'
import * as Slider from '../src/components/slider.js'

const initConfig = { id: 'volume', min: 0, max: 100, step: 1 }

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
})
