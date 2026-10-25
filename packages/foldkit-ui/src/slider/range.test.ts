import { describe, expect, it } from 'vitest'
import * as Range from './range.js'

const config: Range.RangeConfig = {
  min: 0,
  max: 100,
  step: 5,
  orientation: 'horizontal',
  thumbs: [
    { id: 'low', value: 18, min: 10, max: 40, step: 4 },
    { id: 'high', value: 70, min: 50, max: 90, step: 10 },
  ],
}

describe('Slider.Range', () => {
  it('uses a per-thumb lower bound as the effective step-grid origin', () => {
    const result = Range.update(Range.init(config), config, {
      _tag: 'Step',
      id: 'low',
      delta: 1,
    })
    expect(result.outMessage).toEqual({
      _tag: 'ValuesChanged',
      thumbs: [
        { id: 'low', value: 22, min: 10, max: 40, step: 4 },
        config.thumbs[1],
      ],
    })
  })

  it('restores the full pointer-drag snapshot when canceled', () => {
    const initial = Range.init(config)
    const dragging = Range.update(initial, config, { _tag: 'DragStart', id: 'low' }).model
    const moved = Range.update(dragging, config, { _tag: 'DragValue', id: 'low', value: 30 }).model
    const canceled = Range.update(moved, config, { _tag: 'CancelDrag' })
    expect(canceled.outMessage).toEqual({ _tag: 'ValuesChanged', thumbs: config.thumbs })
  })
})
