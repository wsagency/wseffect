import { Effect, Fiber, Stream } from 'effect'
import type * as Mount from '@wsagency/wseffect-foldkit/mount'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { describe, expect, it, vi } from 'vitest'
import * as Slider from '../src/components/slider.js'

describe('themed Slider.Range disabled state', () => {
  it('ignores pointer input while disabled and accepts it after re-enabling', async () => {
    const config: Slider.RangeConfig = {
      min: 0,
      max: 100,
      step: 1,
      orientation: 'horizontal',
      thumbs: [{ id: 'low', value: 18 }],
      isDisabled: true,
    }
    let mounted: Mount.MountAction<Slider.RangeMessage> | undefined
    const root = document.createElement('div')
    root.setAttribute('data-range-slider-root', '')
    root.setAttribute('data-disabled', '')
    root.getBoundingClientRect = () => ({
      x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 20, width: 100, height: 20,
      toJSON: () => ({}),
    })
    const host = root.appendChild(document.createElement('div'))
    const input = document.createElement('input')
    input.type = 'range'
    input.dataset['thumbId'] = 'low'
    input.value = '18'
    host.append(input)
    const builder = new Proxy({}, {
      get: (_target, key) => {
        if (key === 'OnMount') return (action: Mount.MountAction<Slider.RangeMessage>) => { mounted = action }
        if (key === 'Attribute') return (name: string, value: string) => {
          if (name === 'data-disabled') host.setAttribute(name, value)
        }
        return () => undefined
      },
    }) as unknown as HtmlBuilder<Slider.RangeMessage>
    Slider.Range.view(Slider.Range.init(config), config, builder)
    expect(host.getAttribute('data-disabled')).toBe('true')
    const messages: Slider.RangeMessage[] = []
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
    }
    try {
      await vi.waitFor(() => expect(addListener).toHaveBeenCalledWith('pointerdown', expect.any(Function)))
      pointerDown()
      expect(messages).toEqual([])
      Slider.Range.view(Slider.Range.init({ ...config, isDisabled: false }), { ...config, isDisabled: false }, builder)
      expect(host.getAttribute('data-disabled')).toBe('false')
      pointerDown()
      await vi.waitFor(() => expect(messages.map(message => message._tag)).toEqual(['DragStart', 'DragValue']))
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
      addListener.mockRestore()
    }
  })
})
