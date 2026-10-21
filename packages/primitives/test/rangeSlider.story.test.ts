import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { Schema } from 'effect'
import { expect, it } from 'vitest'
import * as RangeSlider from '../src/range-slider.js'

const config: RangeSlider.Config = {
  min: 0, max: 100, step: 1, orientation: 'horizontal',
  thumbs: [{ id: 'low', value: 25 }, { id: 'high', value: 75 }],
}
const resultValue = (result: ReturnType<typeof RangeSlider.update>, id: string) =>
  result.outMessage?._tag === 'ValuesChanged' ? result.outMessage.thumbs.find(thumb => thumb.id === id)?.value : undefined

it('clamps thumb between neighbors', () => {
  const result = RangeSlider.update(RangeSlider.init(config), config, { _tag: 'DragValue', id: 'low', value: 90 })
  expect(resultValue(result, 'low')).toBe(75)
})

it('Page changes ten steps', () => {
  const pageConfig = { ...config, thumbs: [{ id: 'low', value: 20 }, { id: 'high', value: 80 }] }
  const result = RangeSlider.update(RangeSlider.init(pageConfig), pageConfig, { _tag: 'Page', id: 'low', direction: 1 })
  expect(resultValue(result, 'low')).toBe(30)
})

it('Escape restores pre-drag values', () => {
  let model = RangeSlider.init(config)
  model = RangeSlider.update(model, config, { _tag: 'DragStart', id: 'low' }).model
  model = RangeSlider.update(model, config, { _tag: 'DragValue', id: 'low', value: 40 }).model
  const result = RangeSlider.update(model, config, { _tag: 'CancelDrag' })
  expect(resultValue(result, 'low')).toBe(25)
  expect(result.model.dragStartValues).toBeNull()
})

it('supports vertical arrow direction', () => {
  const vertical = { ...config, orientation: 'vertical' as const, thumbs: [{ id: 'low', value: 20 }, { id: 'high', value: 80 }] }
  const result = RangeSlider.update(RangeSlider.init(vertical), vertical, { _tag: 'Step', id: 'low', delta: 1 })
  expect(resultValue(result, 'low')).toBe(21)
})

it('Model and Message schemas round-trip through the APP-8 page-model codec', () => {
  const model = RangeSlider.init(config)
  const encoded = Schema.encodeSync(RangeSlider.Model)(model)
  expect(Schema.decodeUnknownSync(RangeSlider.Model)(encoded)).toEqual(model)
  const message: RangeSlider.Message = { _tag: 'Step', id: 'low', delta: 1 }
  const encodedMessage = Schema.encodeSync(RangeSlider.Message)(message)
  expect(Schema.decodeUnknownSync(RangeSlider.Message)(encodedMessage)).toEqual(message)
})
it('keyboard commands respect thumb-specific bounds', () => {
  let model = RangeSlider.init(config)
  const lower = RangeSlider.update(model, config, { _tag: 'FocusThumb', id: 'low' })
  expect(lower.model.activeThumbId).toBe('low')
  model = lower.model
  const upper = RangeSlider.update(model, config, { _tag: 'SetBoundary', id: 'low', boundary: 'max' })
  expect(resultValue(upper, 'low')).toBe(75)
  expect(upper.model.activeThumbId).toBe('low')
  const page = RangeSlider.update(upper.model, config, { _tag: 'Page', id: 'high', direction: -1 })
  expect(resultValue(page, 'high')).toBe(65)
})

it('drag lifecycle emits changed values, commits, and cancels to its start', () => {
  const started = RangeSlider.update(RangeSlider.init(config), config, { _tag: 'DragStart', id: 'low' })
  expect(started.model.dragStartValues).toEqual(config.thumbs)
  const moved = RangeSlider.update(started.model, config, { _tag: 'DragValue', id: 'low', value: 40 })
  expect(resultValue(moved, 'low')).toBe(40)
  const committed = RangeSlider.update(moved.model, config, { _tag: 'DragEnd' })
  expect(committed.model.dragStartValues).toBeNull()
  const cancelled = RangeSlider.update(started.model, config, { _tag: 'CancelDrag' })
  expect(resultValue(cancelled, 'low')).toBe(25)
  const idleCancel = RangeSlider.update(cancelled.model, config, { _tag: 'CancelDrag' })
  expect(idleCancel.outMessage).toBeUndefined()
})
type SceneModel = { slider: RangeSlider.Model; config: RangeSlider.Config }
const sceneModel = (): SceneModel => ({ slider: RangeSlider.init(config), config })
const update = (model: SceneModel, message: RangeSlider.Message) => {
  const result = RangeSlider.update(model.slider, model.config, message)
  return {
    ...result,
    model: {
      slider: result.model,
      config: result.outMessage === undefined ? model.config : { ...model.config, thumbs: result.outMessage.thumbs },
    },
  }
}
const render = (model: SceneModel, h: HtmlBuilder<RangeSlider.Message>) => RangeSlider.view(model.slider, model.config, h)

it('keyboard view bindings clamp and move thumbs within accessible bounds', () => {
  Scene.scene(
    { update, view: render },
    Scene.given(sceneModel()),
    Scene.focus(Scene.role('slider', { name: 'low' })),
    Scene.keydown(Scene.role('slider', { name: 'low' }), 'End'),
    Scene.expect(Scene.role('slider', { name: 'low' })).toHaveAttr('value', '75'),
    Scene.focus(Scene.role('slider', { name: 'high' })),
    Scene.keydown(Scene.role('slider', { name: 'high' }), 'Home'),
    Scene.expect(Scene.role('slider', { name: 'high' })).toHaveAttr('value', '75'),
    Scene.keydown(Scene.role('slider', { name: 'high' }), 'ArrowRight'),
    Scene.expect(Scene.role('slider', { name: 'high' })).toHaveAttr('value', '76'),
  )
})
it('input and pointer bindings start, update, and end a drag', () => {
  Scene.scene(
    { update, view: render },
    Scene.given(sceneModel()),
    Scene.pointerDown(Scene.role('slider', { name: 'low' })),
    Scene.type(Scene.role('slider', { name: 'low' }), '40'),
    Scene.expect(Scene.role('slider', { name: 'low' })).toHaveAttr('value', '40'),
    Scene.pointerUp(Scene.role('slider', { name: 'low' })),
  )
})

it('processes every Message arm', () => {
  let model = RangeSlider.init(config)
  const messages: RangeSlider.Message[] = [
    { _tag: 'FocusThumb', id: 'high' },
    { _tag: 'Step', id: 'low', delta: 1 },
    { _tag: 'Page', id: 'high', direction: -1 },
    { _tag: 'SetBoundary', id: 'low', boundary: 'min' },
    { _tag: 'DragStart', id: 'low' },
    { _tag: 'DragValue', id: 'low', value: 30 },
    { _tag: 'DragEnd' },
    { _tag: 'CancelDrag' },
  ]
  for (const message of messages) model = RangeSlider.update(model, config, message).model
  expect(model.activeThumbId).toBe('low')
  expect(model.dragStartValues).toBeNull()
})
