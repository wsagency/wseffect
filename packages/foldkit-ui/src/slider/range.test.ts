import { Option } from 'effect'
import { inertHtml as ih } from '@wsagency/wseffect-foldkit/html'
import type { Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'

import { Effect, Fiber, Stream } from 'effect'
import type * as Mount from '@wsagency/wseffect-foldkit/mount'
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
  it('fills from the minimum for a single thumb and between thumbs for a range', () => {
    const childAt = (node: Html | undefined, index: number): Html | undefined => {
      const child = node?.children?.[index]
      return child !== undefined && typeof child !== 'string' ? child : undefined
    }
    const styleAt = (node: Html | undefined) => node?.data?.attrs?.['style']

    const single = { ...config, thumbs: [{ id: 'single', value: 48 }] }
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const h = ih as unknown as HtmlBuilder<Range.RangeMessage>
    const singleView = Range.view(Range.init(single), single, h)
    expect(styleAt(childAt(childAt(singleView ?? undefined, 0), 0)))
      .toBe('left:0%;top:0;width:48%;height:100%')

    const rangeView = Range.view(Range.init(config), config, h)
    expect(styleAt(childAt(childAt(rangeView ?? undefined, 0), 0)))
      .toBe('left:18%;top:0;width:52%;height:100%')
  })
  it('maps thumb keyboard and input interactions to range messages', () => {
    const inputs: Array<(value: string) => Range.RangeMessage> = []
    const keyHandlers: Array<
      (key: string) => Option.Option<Range.RangeMessage>
    > = []
    const builder = new Proxy({}, {
      get: (_target, key) => {
        if (key === 'OnInput') {
          return (handler: (value: string) => Range.RangeMessage) => {
            inputs.push(handler)
          }
        }
        if (key === 'OnKeyDownPreventDefault') {
          return (
            handler: (key: string) => Option.Option<Range.RangeMessage>,
          ) => {
            keyHandlers.push(handler)
          }
        }
        return () => undefined
      },
    }) as unknown as HtmlBuilder<Range.RangeMessage>

    const model = Range.init(config)
    Range.view(model, config, builder)
    const keyMessage = keyHandlers[0]!
    expect(keyMessage('Home')).toEqual(
      Option.some({ _tag: 'SetBoundary', id: 'low', boundary: 'min' }),
    )
    expect(keyMessage('End')).toEqual(
      Option.some({ _tag: 'SetBoundary', id: 'low', boundary: 'max' }),
    )
    expect(keyMessage('PageUp')).toEqual(
      Option.some({ _tag: 'Page', id: 'low', direction: 1 }),
    )
    expect(keyMessage('PageDown')).toEqual(
      Option.some({ _tag: 'Page', id: 'low', direction: -1 }),
    )
    expect(keyMessage('ArrowRight')).toEqual(
      Option.some({ _tag: 'Step', id: 'low', delta: 1 }),
    )
    expect(keyMessage('ArrowUp')).toEqual(
      Option.some({ _tag: 'Step', id: 'low', delta: 1 }),
    )
    expect(keyMessage('ArrowLeft')).toEqual(
      Option.some({ _tag: 'Step', id: 'low', delta: -1 }),
    )
    expect(keyMessage('ArrowDown')).toEqual(
      Option.some({ _tag: 'Step', id: 'low', delta: -1 }),
    )
    expect(keyMessage('Escape')).toEqual(Option.none())
    expect(keyMessage('Tab')).toEqual(Option.none())

    const inputMessage = inputs[0]!('35')
    expect(inputMessage).toEqual({
      _tag: 'DragValue',
      id: 'low',
      value: 35,
    })
    expect(Range.update(model, config, inputMessage).outMessage).toEqual({
      _tag: 'ValuesChanged',
      thumbs: [
        { ...config.thumbs[0], value: 34 },
        config.thumbs[1],
      ],
    })

    const dragging = Range.update(model, config, {
      _tag: 'DragStart',
      id: 'low',
    }).model
    Range.view(dragging, config, builder)
    expect(keyHandlers.at(-1)?.('Escape')).toEqual(
      Option.some({ _tag: 'CancelDrag' }),
    )
  })

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
  it('honors thumb bounds and pages by ten steps', () => {
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

  it('clamps a moved thumb at its neighbor even when its own maximum is higher', () => {
    const boundedConfig = {
      ...config,
      thumbs: [
        { id: 'low', value: 18, min: 10, max: 95, step: 4 },
        { id: 'high', value: 70, min: 50, max: 90, step: 10 },
      ],
    }
    const result = Range.update(Range.init(boundedConfig), boundedConfig, {
      _tag: 'DragValue',
      id: 'low',
      value: 92,
    })
    expect(result.outMessage?._tag === 'ValuesChanged'
      ? result.outMessage.thumbs[0]?.value
      : undefined).toBe(70)
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
  it('reads disabled state from the mounted element after patches', async () => {
    let mounted: Mount.MountAction<Range.RangeMessage> | undefined
    const builder = new Proxy({}, {
      get: (_target, key) => key === 'OnMount'
        ? (action: Mount.MountAction<Range.RangeMessage>) => { mounted = action }
        : () => undefined,
    }) as unknown as HtmlBuilder<Range.RangeMessage>
    Range.view(Range.init(config), config, builder)
    const root = document.createElement('div')
    root.setAttribute('data-range-slider-root', '')
    root.getBoundingClientRect = () => ({
      x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 20, width: 100, height: 20,
      toJSON: () => ({}),
    })
    const host = root.appendChild(document.createElement('div'))
    host.setAttribute('data-disabled', 'true')
    const input = document.createElement('input')
    input.type = 'range'
    input.dataset['thumbId'] = 'low'
    input.value = '18'
    host.append(input)
    const messages: Range.RangeMessage[] = []
    const addListener = vi.spyOn(host, 'addEventListener')
    const fiber = Effect.runFork(Stream.runForEach(
      mounted!.f(host, Stream.empty),
      message => Effect.sync(() => messages.push(message)),
    ))
    const pointerDown = () => {
      const event = new Event('pointerdown', { bubbles: true, cancelable: true })
      Object.defineProperties(event, {
        pointerId: { value: 1 },
        button: { value: 0 },
        clientX: { value: 18 },
      })
      host.dispatchEvent(event)
      return event
    }
    try {
      await vi.waitFor(() => expect(addListener).toHaveBeenCalledWith('pointerdown', expect.any(Function)))
      expect(pointerDown().defaultPrevented).toBe(false)
      expect(messages).toEqual([])
      host.removeAttribute('data-disabled')
      expect(pointerDown().defaultPrevented).toBe(true)
      await vi.waitFor(() => expect(messages.map(message => message._tag)).toEqual(['DragStart', 'DragValue']))
      const pointerUp = new Event('pointerup', { bubbles: true })
      Object.defineProperty(pointerUp, 'pointerId', { value: 1 })
      document.dispatchEvent(pointerUp)
      await vi.waitFor(() => expect(messages.map(message => message._tag)).toEqual(['DragStart', 'DragValue', 'DragEnd']))
      host.setAttribute('data-disabled', 'true')
      expect(pointerDown().defaultPrevented).toBe(false)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})
