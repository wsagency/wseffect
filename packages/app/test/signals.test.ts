import { Effect, Fiber, Schema, Stream } from 'effect'
import { ServerSentEventGenerator } from '@starfederation/datastar-sdk/web'
import { describe, expect, it, vi } from 'vitest'
import { signalSubscription } from '../src/signals.js'

const schema = Schema.Struct({ count: Schema.Number })

function streamFor(transport: { readonly _tag: 'EventSource'; readonly url: string } | { readonly _tag: 'Fetch'; readonly url: string }) {
  const subscription = signalSubscription({ schema, transport, toMessage: (outcome) => outcome })
  return subscription.dependenciesToStream({}, () => ({}))
}

describe('signalSubscription', () => {
  it('parsesSdkPatchSignalsToTypedMessage', async () => {
    const response = ServerSentEventGenerator.stream((events) => { events.patchSignals('{"count":7}') }, { keepalive: false })
    const wire = await response.text()
    expect(wire).toContain('event: datastar-patch-signals')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(wire, { headers: { 'content-type': 'text/event-stream' } })))
    expect(await Effect.runPromise(Stream.runCollect(Stream.take(streamFor({ _tag: 'Fetch', url: '/signals' }), 1)))).toEqual([
      { _tag: 'SignalPatch', value: { count: 7 }, onlyIfMissing: false },
    ])
    vi.unstubAllGlobals()
  })

  it('rejectsMalformedJsonUnsupportedEventAndSchemaFailure', async () => {
    const frames = [
      ['event: datastar-patch-signals\ndata: signals {oops}\n\n', 'MalformedJson'],
      ['event: datastar-patch-elements\ndata: signals {"count":1}\n\n', 'UnsupportedEvent'],
      ['event: datastar-patch-signals\ndata: signals {"count":"wrong"}\n\n', 'SchemaFailure'],
    ] as const
    for (const [frame, reason] of frames) {
      vi.stubGlobal('fetch', vi.fn(async () => new Response(frame)))
      const result = await Effect.runPromise(Stream.runCollect(Stream.take(streamFor({ _tag: 'Fetch', url: '/signals' }), 1)))
      expect(result).toEqual([{ _tag: 'RejectedSignalPatch', reason }])
      vi.unstubAllGlobals()
    }
  })

  it('usesSelectedEventSourceOrFetchTransport', async () => {
    const source = { addEventListener: vi.fn(), close: vi.fn(), onopen: null, onerror: null }
    const Source = vi.fn(function () { return source })
    vi.stubGlobal('EventSource', Source)
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    const fiber = Effect.runFork(Stream.runCollect(streamFor({ _tag: 'EventSource', url: '/signals' })))
    await vi.waitFor(() => expect(Source).toHaveBeenCalledOnce())
    expect(Source).toHaveBeenCalledWith('/signals', { withCredentials: undefined })
    await Effect.runPromise(Fiber.interrupt(fiber))
    expect(source.close).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  it('reconnectsWithBoundedBackoffAndResetsAfterSuccess', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const successResponse = ServerSentEventGenerator.stream((events) => { events.patchSignals('{"count":1}') }, { keepalive: false })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(successResponse)
      .mockImplementation(() => new Promise<Response>(() => {}))
    vi.stubGlobal('fetch', fetchMock)
    const toMessage = vi.fn((outcome) => outcome)
    const subscription = signalSubscription({
      schema,
      transport: { _tag: 'Fetch', url: '/signals' },
      backoff: { delaysMs: [250, 500], jitter: 0.2 },
      toMessage,
    })
    const fiber = Effect.runFork(Stream.runCollect(subscription.dependenciesToStream({}, () => ({}))))
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(toMessage).toHaveBeenCalledWith({ _tag: 'SignalTransportFailure', reason: 'Network' }))
    await vi.advanceTimersByTimeAsync(250)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    await vi.advanceTimersByTimeAsync(250)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(3)
    await Effect.runPromise(Fiber.interrupt(fiber))
    vi.restoreAllMocks()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('pausesOfflineResumesOnline', async () => {
    vi.useFakeTimers()
    const staleResponse = Promise.withResolvers<Response>()
    const abortSpy = vi.fn()
    const toMessage = vi.fn((outcome) => outcome)
    const fetchMock = vi.fn()
      .mockImplementationOnce((_url: string, init: RequestInit) => {
        init.signal?.addEventListener('abort', abortSpy)
        return staleResponse.promise
      })
      .mockResolvedValue(new Response(null, { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    const subscription = signalSubscription({ schema, transport: { _tag: 'Fetch', url: '/signals' }, toMessage })
    const fiber = Effect.runFork(Stream.runCollect(subscription.dependenciesToStream({}, () => ({}))))
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    window.dispatchEvent(new Event('offline'))
    await vi.advanceTimersByTimeAsync(5000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(abortSpy).toHaveBeenCalledOnce()
    window.dispatchEvent(new Event('online'))
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    staleResponse.resolve(new Response(`event: datastar-patch-signals
data: signals {"count":9}

`))
    await staleResponse.promise
    await Promise.resolve()
    expect(toMessage).not.toHaveBeenCalledWith(expect.objectContaining({ _tag: 'SignalPatch' }))
    await Effect.runPromise(Fiber.interrupt(fiber))
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('closesAndCancelsOnInterruption', async () => {
    const abortSpy = vi.fn()
    const response = Promise.withResolvers<Response>()
    const toMessage = vi.fn((outcome) => outcome)
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => {
      init.signal?.addEventListener('abort', abortSpy)
      return response.promise
    }))
    const subscription = signalSubscription({ schema, transport: { _tag: 'Fetch', url: '/signals' }, toMessage })
    const fiber = Effect.runFork(Stream.runCollect(subscription.dependenciesToStream({}, () => ({}))))
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce())
    await Effect.runPromise(Fiber.interrupt(fiber))
    expect(abortSpy).toHaveBeenCalledOnce()
    response.resolve(new Response(`event: datastar-patch-signals
data: signals {"count":1}

`))
    await response.promise
    await Promise.resolve()
    expect(toMessage).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
