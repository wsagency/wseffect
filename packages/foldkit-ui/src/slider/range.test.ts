import { Effect, Fiber, Stream } from 'effect'
import type * as Mount from '@wsagency/wseffect-foldkit/mount'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { describe, expect, it, vi } from 'vitest'
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
  it('honors thumb bounds, prevents crossing, and pages by ten steps', () => {
    const result = Range.update(Range.init(config), config, {
      _tag: 'DragValue',
      id: 'low',
      value: 90,
    })
    expect(result.outMessage?._tag === 'ValuesChanged' ? result.outMessage.thumbs[0]?.value : undefined).toBe(40)
    const page = Range.update(Range.init(config), config, {
      _tag: 'Page',
      id: 'high',
      direction: -1,
    })
    expect(page.outMessage?._tag === 'ValuesChanged' ? page.outMessage.thumbs[1]?.value : undefined).toBe(50)
    const boundary = Range.update(Range.init(config), config, {
      _tag: 'SetBoundary',
      id: 'low',
      boundary: 'max',
    })
    expect(boundary.outMessage?._tag === 'ValuesChanged' ? boundary.outMessage.thumbs[0]?.value : undefined).toBe(40)
  })

  it('does not emit values on an idle cancel', () => {
    expect(Range.update(Range.init(config), config, { _tag: 'CancelDrag' }).outMessage).toBeUndefined()
  })
  it('cancels the mounted pointer drag on pointercancel and Escape', async () => {
    let mounted: Mount.MountAction<Range.RangeMessage> | undefined
    const builder = new Proxy({}, {
      get: (_target, key) => key === 'OnMount'
        ? (action: Mount.MountAction<Range.RangeMessage>) => { mounted = action }
        : () => undefined,
    }) as unknown as HtmlBuilder<Range.RangeMessage>
    Range.view(Range.init(config), config, builder)
    expect(mounted).toBeDefined()
    const root = document.createElement('div')
    root.setAttribute('data-range-slider-root', '')
    root.getBoundingClientRect = () => ({
      x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 20, width: 100, height: 20,
      toJSON: () => ({}),
    })
    const host = root.appendChild(document.createElement('div'))
    for (const [id, value] of [['low', 18], ['high', 70]] as const) {
      const input = document.createElement('input')
      input.type = 'range'
      input.dataset['thumbId'] = id
      input.value = String(value)
      host.append(input)
    }
    const messages: Range.RangeMessage[] = []
    const addListener = vi.spyOn(host, 'addEventListener')
    const fiber = Effect.runFork(Stream.runForEach(
      mounted!.f(host, Stream.empty),
      message => Effect.sync(() => messages.push(message)),
    ))
    const pointer = (target: EventTarget, type: string, pointerId: number, clientX: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true })
      Object.defineProperties(event, {
        pointerId: { value: pointerId },
        button: { value: 0 },
        clientX: { value: clientX },
      })
      target.dispatchEvent(event)
    }
    try {
      await vi.waitFor(() => expect(addListener).toHaveBeenCalledWith('pointerdown', expect.any(Function)))
      pointer(host, 'pointerdown', 1, 18)
      pointer(document, 'pointermove', 1, 30)
      pointer(document, 'pointerup', 1, 30)
      pointer(host, 'pointerdown', 2, 18)
      pointer(document, 'pointermove', 2, 30)
      pointer(document, 'pointercancel', 2, 30)
      pointer(host, 'pointerdown', 3, 18)
      const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      document.dispatchEvent(escape)
      expect(escape.defaultPrevented).toBe(true)
      await vi.waitFor(() => expect(messages).toHaveLength(11))
      expect(messages.map(message => message._tag)).toEqual([
        'DragStart', 'DragValue', 'DragValue', 'DragEnd',
        'DragStart', 'DragValue', 'DragValue', 'CancelDrag',
        'DragStart', 'DragValue', 'CancelDrag',
      ])
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
      addListener.mockRestore()
    }
  })
})
