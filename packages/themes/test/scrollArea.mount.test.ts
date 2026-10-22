import { Effect, Fiber, Stream } from 'effect'
import { describe, expect, it, vi } from 'vitest'
import { mountScrollArea } from '../src/components/scroll-area.mount.js'

describe('ScrollArea custom thumb mount', () => {
  it('syncs native scroll position and disconnects listeners on release', async () => {
    const root = document.createElement('div')
    root.innerHTML = '<div class="rt-ScrollAreaViewport"></div><div class="rt-ScrollAreaScrollbar" data-orientation="vertical"><div class="rt-ScrollAreaThumb"></div></div>'
    const viewport = root.querySelector<HTMLElement>('.rt-ScrollAreaViewport')!
    const track = root.querySelector<HTMLElement>('.rt-ScrollAreaScrollbar')!
    const thumb = root.querySelector<HTMLElement>('.rt-ScrollAreaThumb')!
    Object.defineProperty(thumb, 'offsetHeight', { configurable: true, value: 20 })
    for (const [target, key, value] of [[viewport, 'clientHeight', 100], [viewport, 'clientWidth', 100], [viewport, 'scrollHeight', 500], [viewport, 'scrollWidth', 100], [track, 'clientHeight', 100], [track, 'clientWidth', 10]] as const) {
      Object.defineProperty(target, key, { configurable: true, value })
    }
    const previousResizeObserver = globalThis.ResizeObserver
    const disconnect = vi.fn()
    globalThis.ResizeObserver = class {
      observe() {}
      disconnect = disconnect
      unobserve() {}
    } as unknown as typeof ResizeObserver
    const addListener = vi.spyOn(viewport, 'addEventListener').mockImplementation((type, listener, options) => {
      EventTarget.prototype.addEventListener.call(viewport, type, listener, options)
    })
    const fiber = Effect.runFork(Stream.runDrain(mountScrollArea<never>().f(root, Stream.empty)))
    await vi.waitFor(() => expect(addListener).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true }))
    expect(track.dataset.state).toBe('visible')
    expect(thumb.style.height).toBe('20px')
    addListener.mockRestore()
    viewport.scrollTop = 200
    viewport.dispatchEvent(new Event('scroll'))
    expect(thumb.style.transform).toBe('translateY(40px)')
    track.getBoundingClientRect = () => ({ top: 0, left: 0, right: 10, bottom: 100, width: 10, height: 100, x: 0, y: 0, toJSON: () => ({}) })
    const pointerEvent = (type: string, target: HTMLElement, pointerId: number, clientY: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true })
      Object.defineProperties(event, { pointerId: { value: pointerId }, clientY: { value: clientY }, clientX: { value: 0 } })
      target.dispatchEvent(event)
    }
    pointerEvent('pointerdown', track, 7, 80)
    expect(viewport.scrollTop).toBe(350)
    pointerEvent('pointerdown', thumb, 8, 10)
    pointerEvent('pointermove', root, 8, 30)
    expect(viewport.scrollTop).toBe(450)
    pointerEvent('pointerup', root, 8, 30)
    await Effect.runPromise(Fiber.interrupt(fiber))
    expect(disconnect).toHaveBeenCalledOnce()
    if (previousResizeObserver === undefined) Reflect.deleteProperty(globalThis, 'ResizeObserver')
    else globalThis.ResizeObserver = previousResizeObserver
    viewport.scrollTop = 300
    viewport.dispatchEvent(new Event('scroll'))
    expect(thumb.style.transform).toBe('translateY(90px)')
  })
})
