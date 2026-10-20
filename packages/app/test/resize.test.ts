import { Effect, Fiber, Stream } from 'effect'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resizeObserverMount, type ResizeResult } from '../src/index.js'

type ResizeCallback = (entries: ReadonlyArray<{ readonly contentRect: { readonly width: number; readonly height: number } }>) => void

let observerCallback: ResizeCallback | undefined
let disconnected = 0
let frames: Array<FrameRequestCallback> = []

class FakeResizeObserver {
  constructor(callback: ResizeCallback) { observerCallback = callback }
  observe(): void {}
  disconnect(): void {
    disconnected += 1
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  observerCallback = undefined
  frames = []
})

const toResult = (result: ResizeResult) => result
const makeElement = () => document.createElement('div')
const begin = (element: Element) => Effect.runPromise(Stream.runHead(resizeObserverMount(toResult).f(element, Stream.empty)))

describe('resizeObserverMount', () => {
  it('emitsChangedWidthAndHeight', async () => {
    disconnected = 0
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const pending = begin(makeElement())
    await vi.waitFor(() => expect(observerCallback).toBeDefined())
    observerCallback?.([{ contentRect: { width: 120, height: 45 } }])
    frames.shift()?.(0)
    expect(await pending).toMatchObject({ _tag: 'Some', value: { _tag: 'Resized', width: 120, height: 45 } })
    expect(disconnected).toBe(1)
  })

  it('coalescesFrameAndDeduplicatesDimensions', async () => {
    disconnected = 0
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const element = makeElement()
    const action = resizeObserverMount(toResult)
    const pending = Effect.runPromise(Stream.runCollect(Stream.take(action.f(element, Stream.empty), 2)))
    await vi.waitFor(() => expect(observerCallback).toBeDefined())
    observerCallback?.([{ contentRect: { width: 10, height: 20 } }])
    observerCallback?.([{ contentRect: { width: 11, height: 21 } }])
    expect(frames).toHaveLength(1)
    frames.shift()?.(0)
    observerCallback?.([{ contentRect: { width: 11, height: 21 } }])
    frames.shift()?.(0)
    observerCallback?.([{ contentRect: { width: 12, height: 22 } }])
    frames.shift()?.(0)
    expect(Array.from(await pending)).toEqual([
      { _tag: 'Resized', width: 11, height: 21 },
      { _tag: 'Resized', width: 12, height: 22 },
    ])
  })

  it('disconnectsAndCancelsPendingFrameOnRelease', async () => {
    disconnected = 0
    const cancelAnimationFrame = vi.fn()
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length })
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame)
    const element = makeElement()
    const toMessage = vi.fn((result: ResizeResult) => result)
    const fiber = Effect.runFork(Stream.runHead(resizeObserverMount(toMessage).f(element, Stream.empty)))
    await vi.waitFor(() => expect(observerCallback).toBeDefined())
    observerCallback?.([{ contentRect: { width: 1, height: 2 } }])
    await Effect.runPromise(Fiber.interrupt(fiber))
    expect(cancelAnimationFrame).toHaveBeenCalledTimes(1)
    frames.shift()?.(0)
    expect(toMessage).not.toHaveBeenCalled()
  })

  it('cancelsTimeoutWithClearTimeoutWhenAnimationFramesAreUnavailable', async () => {
    disconnected = 0
    const clearTimeout = vi.fn()
    const cancelAnimationFrame = vi.fn()
    const setTimeout = vi.fn(() => 77)
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    const fiber = Effect.runFork(Stream.runHead(resizeObserverMount(toResult).f(makeElement(), Stream.empty)))
    await vi.waitFor(() => expect(observerCallback).toBeDefined())
    vi.stubGlobal('requestAnimationFrame', undefined)
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame)
    vi.stubGlobal('setTimeout', setTimeout)
    vi.stubGlobal('clearTimeout', clearTimeout)
    observerCallback?.([{ contentRect: { width: 1, height: 2 } }])
    await Effect.runPromise(Fiber.interrupt(fiber))
    expect(setTimeout).toHaveBeenCalledOnce()
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 0)
    expect(clearTimeout).toHaveBeenCalledOnce()
    expect(clearTimeout).toHaveBeenCalledWith(77)
    expect(cancelAnimationFrame).not.toHaveBeenCalled()
  })
  it('reportsUnsupportedAndObserverFailureAsTypedOutcomes', async () => {
    vi.stubGlobal('ResizeObserver', undefined)
    expect(await begin(makeElement())).toMatchObject({ _tag: 'Some', value: { _tag: 'ResizeUnavailable' } })
    vi.stubGlobal('ResizeObserver', class { constructor() { throw new Error('observer blocked') } })
    expect(await begin(makeElement())).toMatchObject({ _tag: 'Some', value: { _tag: 'ResizeFailure', reason: 'observer blocked' } })
  })
})
