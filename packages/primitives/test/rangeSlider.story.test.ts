import { Effect, Fiber, Schema, Stream } from 'effect'
import type * as Mount from '@wsagency/wseffect-foldkit/mount'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { expect, it, vi } from 'vitest'
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

it('snaps to the effective minimum step grid and preserves exact per-thumb boundaries', () => {
  const bounded: RangeSlider.Config = {
    min: 5, max: 30, step: 3, orientation: 'horizontal',
    thumbs: [
      { id: 'low', value: 8, min: 8, max: 14 },
      { id: 'high', value: 20, min: 18, max: 28 },
    ],
  }
  const stepped = RangeSlider.update(RangeSlider.init(bounded), bounded, { _tag: 'Step', id: 'low', delta: 1 })
  expect(resultValue(stepped, 'low')).toBe(11)
  const lowerBoundary = RangeSlider.update(RangeSlider.init(bounded), bounded, { _tag: 'SetBoundary', id: 'high', boundary: 'min' })
  expect(resultValue(lowerBoundary, 'high')).toBe(18)
  const upperBoundary = RangeSlider.update(RangeSlider.init(bounded), bounded, { _tag: 'SetBoundary', id: 'high', boundary: 'max' })
  expect(resultValue(upperBoundary, 'high')).toBe(28)
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
const sceneModel = (sliderConfig: RangeSlider.Config = config): SceneModel => ({ slider: RangeSlider.init(sliderConfig), config: sliderConfig })
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
it('offsets slider thumbs inward at the track edges', () => Scene.scene(
  { update, view: render },
  Scene.given(sceneModel()),
  Scene.Mount.resolve({ name: 'RangeSliderPointer' }, { _tag: 'FocusThumb', id: 'low' }),
  Scene.expect(Scene.selector("[data-slider-slot='thumb'][data-thumb-id='low']")).toHaveAttr('style', 'left:calc(25% + var(--slider-thumb-size) * 0.25)'),
  Scene.expect(Scene.selector("[data-slider-slot='thumb'][data-thumb-id='high']")).toHaveAttr('style', 'left:calc(75% + var(--slider-thumb-size) * -0.25)'),
))

it('keyboard view bindings clamp and move thumbs within accessible bounds', () => {
  Scene.scene(
    { update, view: render },
    Scene.given(sceneModel()),
    Scene.Mount.resolve({ name: 'RangeSliderPointer' }, { _tag: 'FocusThumb', id: 'low' }),
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
it('PageUp and PageDown move vertical thumbs and expose vertical orientation', () => {
  const vertical = { ...config, orientation: 'vertical' as const, thumbs: [{ id: 'low', value: 20 }, { id: 'high', value: 80 }] }
  Scene.scene(
    { update, view: render },
    Scene.given(sceneModel(vertical)),
    Scene.Mount.resolve({ name: 'RangeSliderPointer' }, { _tag: 'FocusThumb', id: 'low' }),
    Scene.expect(Scene.role('slider', { name: 'low' })).toHaveAttr('aria-orientation', 'vertical'),
    Scene.keydown(Scene.role('slider', { name: 'low' }), 'PageUp'),
    Scene.expect(Scene.role('slider', { name: 'low' })).toHaveAttr('value', '30'),
    Scene.keydown(Scene.role('slider', { name: 'low' }), 'PageDown'),
    Scene.expect(Scene.role('slider', { name: 'low' })).toHaveAttr('value', '20'),
  )
})
it('Escape restores values through the rendered slider control', () => {
  Scene.scene(
    { update, view: render },
    Scene.given(sceneModel()),
    Scene.Mount.resolve({ name: 'RangeSliderPointer' }, { _tag: 'FocusThumb', id: 'low' }),
    Scene.pointerDown(Scene.role('slider', { name: 'low' })),
    Scene.type(Scene.role('slider', { name: 'low' }), '40'),
    Scene.expect(Scene.role('slider', { name: 'low' })).toHaveAttr('value', '40'),
    Scene.keydown(Scene.role('slider', { name: 'low' }), 'Escape'),
    Scene.expect(Scene.role('slider', { name: 'low' })).toHaveAttr('value', '25'),
  )
})
it('input and pointer bindings start, update, and end a drag', () => {
  Scene.scene(
    { update, view: render },
    Scene.given(sceneModel()),
    Scene.Mount.resolve({ name: 'RangeSliderPointer' }, { _tag: 'FocusThumb', id: 'low' }),
    Scene.pointerDown(Scene.role('slider', { name: 'low' })),
    Scene.type(Scene.role('slider', { name: 'low' }), '40'),
    Scene.expect(Scene.role('slider', { name: 'low' })).toHaveAttr('value', '40'),
    Scene.pointerUp(Scene.role('slider', { name: 'low' })),
  )
})
it('runs pointer mount handlers through completion, cancellation, and Escape', async () => {
  let mounted: Mount.MountAction<RangeSlider.Message> | undefined
  const h = new Proxy({}, {
    get: (_target, key) => key === 'OnMount'
      ? (action: Mount.MountAction<RangeSlider.Message>) => { mounted = action }
      : () => undefined,
  }) as unknown as HtmlBuilder<RangeSlider.Message>
  RangeSlider.view(RangeSlider.init(config), config, h)
  expect(mounted).toBeDefined()

  const root = document.createElement('div')
  root.setAttribute('data-range-slider-root', '')
  root.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 20, width: 100, height: 20, toJSON: () => ({}) })
  const host = root.appendChild(document.createElement('div'))
  for (const [id, value] of [['low', 25], ['high', 75]] as const) {
    const input = document.createElement('input')
    input.type = 'range'
    input.dataset.thumbId = id
    input.value = String(value)
    host.append(input)
  }
  const messages: RangeSlider.Message[] = []
  const addListener = vi.spyOn(host, 'addEventListener')
  const fiber = Effect.runFork(Stream.runForEach(mounted!.f(host, Stream.empty), message => Effect.sync(() => messages.push(message))))
  const pointer = (target: EventTarget, type: string, pointerId: number, clientX: number) => {
    const event = new Event(type, { bubbles: true, cancelable: true })
    Object.defineProperties(event, { pointerId: { value: pointerId }, button: { value: 0 }, clientX: { value: clientX } })
    target.dispatchEvent(event)
  }
  try {
    await vi.waitFor(() => expect(addListener).toHaveBeenCalledWith('pointerdown', expect.any(Function)))
    pointer(host, 'pointerdown', 1, 25)
    pointer(document, 'pointermove', 1, 40)
    pointer(document, 'pointerup', 1, 40)
    pointer(host, 'pointerdown', 2, 75)
    pointer(document, 'pointercancel', 2, 75)
    pointer(host, 'pointerdown', 3, 50)
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    document.dispatchEvent(escape)
    pointer(document, 'pointermove', 3, 95)
    await vi.waitFor(() => expect(messages).toHaveLength(10))
    expect(escape.defaultPrevented).toBe(true)
    expect(messages.at(-1)?._tag).toBe('CancelDrag')
    expect(messages.map(message => message._tag)).toEqual(['DragStart', 'DragValue', 'DragValue', 'DragEnd', 'DragStart', 'DragValue', 'CancelDrag', 'DragStart', 'DragValue', 'CancelDrag'])
  } finally {
    await Effect.runPromise(Fiber.interrupt(fiber))
    addListener.mockRestore()
  }
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
