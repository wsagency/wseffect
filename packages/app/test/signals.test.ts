import { Effect, Fiber, Schema, Stream } from 'effect'
import { ServerSentEventGenerator } from '@starfederation/datastar-sdk/web'
import { describe, expect, it, vi } from 'vitest'
import { signalSubscription } from '../src/signals.js'

const schema = Schema.Struct({ count: Schema.Number })

function streamFor(
  transport: { readonly _tag: 'EventSource'; readonly url: string } | { readonly _tag: 'Fetch'; readonly url: string },
  signalSchema: Schema.Codec<any, any, never, never> = schema,
) {
  const subscription = signalSubscription({ schema: signalSchema, transport, toMessage: (outcome) => outcome })
  return subscription.dependenciesToStream({}, () => ({}))
}
function responseWithByteChunks(chunks: ReadonlyArray<Uint8Array>): Response {
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    },
  }), { headers: { 'content-type': 'text/event-stream' } })
}

function splitBytesAt(bytes: Uint8Array, indexes: ReadonlyArray<number>): Uint8Array[] {
  const chunks: Uint8Array[] = []
  let start = 0
  for (const end of indexes) {
    chunks.push(bytes.subarray(start, end))
    start = end
  }
  chunks.push(bytes.subarray(start))
  return chunks
}



describe('signalSubscription', () => {
  it('parsesPrettyPrintedSdkPatchSignals', async () => {
    const response = ServerSentEventGenerator.stream((events) => {
      events.patchSignals(JSON.stringify({ count: 7 }, null, 2))
    }, { keepalive: false })
    const wire = await response.text()
    expect(wire.match(/^data: signals /gm)).toHaveLength(3)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(wire)))
    expect(await Effect.runPromise(Stream.runCollect(Stream.take(streamFor({ _tag: 'Fetch', url: '/signals' }), 1)))).toEqual([
      { _tag: 'SignalPatch', value: { count: 7 }, onlyIfMissing: false },
    ])
    vi.unstubAllGlobals()
  })

  it('parsesChunkedUtf8CRLFAndCRFramesAndIgnoresIdRetryFields', async () => {
    const wire = [
      'event: datastar-patch-signals\r\n',
      'id: 7\r\n',
      'retry: 1000\r\n',
      'data: signals {"count":"🍵"}\r\n\r\n',
      'event: datastar-patch-signals\r',
      'data: signals {"count":\r',
      'data: signals 8}\r\r',
    ].join('')
    const bytes = new TextEncoder().encode(wire)
    const emojiStart = bytes.indexOf(0xf0)
    const crlf = bytes.indexOf(0x0d)
    vi.stubGlobal('fetch', vi.fn(async () => responseWithByteChunks(splitBytesAt(bytes, [crlf + 1, emojiStart + 2]))))
    expect(await Effect.runPromise(Stream.runCollect(Stream.take(streamFor(
      { _tag: 'Fetch', url: '/signals' },
      Schema.Struct({ count: Schema.Union([Schema.Number, Schema.String]) }),
    ), 2)))).toEqual([
      { _tag: 'SignalPatch', value: { count: '🍵' }, onlyIfMissing: false },
      { _tag: 'SignalPatch', value: { count: 8 }, onlyIfMissing: false },
    ])
    vi.unstubAllGlobals()
  })

  it('deliversLargePatchBurstsInOrder', async () => {
    const count = 128
    const wire = Array.from({ length: count }, (_, index) =>
      `event: datastar-patch-signals\ndata: signals {"count":${index}}\n\n`,
    ).join('')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(wire)))
    const patches = await Effect.runPromise(Stream.runCollect(Stream.take(streamFor({ _tag: 'Fetch', url: '/signals' }), count)))
    expect(patches).toEqual(Array.from({ length: count }, (_, count) => ({
      _tag: 'SignalPatch',
      value: { count },
      onlyIfMissing: false,
    })))
    vi.unstubAllGlobals()
  })
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

  it('mapsEventSourceMessagesReconnectsSafelyAndClosesOnInterruption', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    type SourceStub = {
      readonly listeners: Map<string, Array<(event: MessageEvent<string>) => void>>
      readonly close: ReturnType<typeof vi.fn>
      readonly addEventListener: ReturnType<typeof vi.fn>
      onopen: (() => void) | null
      onerror: (() => void) | null
      dispatch: (type: string, data?: string) => void
    }
    const sources: SourceStub[] = []
    class EventSourceStub implements SourceStub {
      readonly listeners = new Map<string, Array<(event: MessageEvent<string>) => void>>()
      readonly close = vi.fn()
      readonly addEventListener = vi.fn((type: string, listener: (event: MessageEvent<string>) => void) => {
        const handlers = this.listeners.get(type) ?? []
        handlers.push(listener)
        this.listeners.set(type, handlers)
      })
      onopen: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor() {
        sources.push(this)
      }
      dispatch(type: string, data = '') {
        for (const listener of this.listeners.get(type) ?? []) listener({ data } as MessageEvent<string>)
      }
    }
    vi.stubGlobal('EventSource', EventSourceStub)
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    const toMessage = vi.fn((outcome) => outcome)
    const subscription = signalSubscription({
      schema,
      transport: { _tag: 'EventSource', url: '/signals' },
      backoff: { delaysMs: [250], jitter: 0 },
      toMessage,
    })
    const fiber = Effect.runFork(Stream.runCollect(subscription.dependenciesToStream({}, () => ({}))))
    await vi.waitFor(() => expect(sources).toHaveLength(1))
    const first = sources[0]!
    expect(first.listeners.get('datastar-patch-signals')).toHaveLength(1)
    first.dispatch('datastar-patch-signals', 'signals {"count":1}')
    await vi.waitFor(() => expect(toMessage).toHaveBeenCalledTimes(1))
    first.dispatch('message', 'signals {"count":2}')
    await vi.waitFor(() => expect(toMessage).toHaveBeenCalledTimes(2))
    expect(toMessage.mock.calls[1]?.[0]).toEqual({ _tag: 'RejectedSignalPatch', reason: 'UnsupportedEvent' })
    first.onerror?.()
    await vi.waitFor(() => expect(toMessage).toHaveBeenCalledTimes(3))
    first.dispatch('datastar-patch-signals', 'signals {"count":3}')
    expect(toMessage).toHaveBeenCalledTimes(3)
    expect(first.close).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(250)
    await vi.waitFor(() => expect(sources).toHaveLength(2))
    await Effect.runPromise(Fiber.interrupt(fiber))
    expect(sources[1]?.close).toHaveBeenCalledOnce()
    vi.restoreAllMocks()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('suppressesEventSourcePatchAfterErrorBeforeReconnect', async () => {
    vi.useFakeTimers()
    type SourceStub = {
      readonly listeners: Map<string, Array<(event: MessageEvent<string>) => void>>
      readonly close: ReturnType<typeof vi.fn>
      readonly addEventListener: ReturnType<typeof vi.fn>
      onopen: (() => void) | null
      onerror: (() => void) | null
      dispatch: (type: string, data?: string) => void
    }
    const sources: SourceStub[] = []
    class EventSourceStub implements SourceStub {
      readonly listeners = new Map<string, Array<(event: MessageEvent<string>) => void>>()
      readonly close = vi.fn()
      readonly addEventListener = vi.fn((type: string, listener: (event: MessageEvent<string>) => void) => {
        const handlers = this.listeners.get(type) ?? []
        handlers.push(listener)
        this.listeners.set(type, handlers)
      })
      onopen: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor() {
        sources.push(this)
      }
      dispatch(type: string, data = '') {
        for (const listener of this.listeners.get(type) ?? []) listener({ data } as MessageEvent<string>)
      }
    }
    vi.stubGlobal('EventSource', EventSourceStub)
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    const toMessage = vi.fn((outcome) => outcome)
    const subscription = signalSubscription({
      schema,
      transport: { _tag: 'EventSource', url: '/signals' },
      backoff: { delaysMs: [250], jitter: 0 },
      toMessage,
    })
    const fiber = Effect.runFork(Stream.runCollect(subscription.dependenciesToStream({}, () => ({}))))
    await vi.waitFor(() => expect(sources).toHaveLength(1))
    const first = sources[0]!
    first.onerror?.()
    await vi.waitFor(() => expect(toMessage).toHaveBeenCalledWith({ _tag: 'SignalTransportFailure', reason: 'Network' }))
    first.dispatch('datastar-patch-signals', 'signals {"count":3}')
    expect(toMessage).not.toHaveBeenCalledWith(expect.objectContaining({ _tag: 'SignalPatch' }))
    await vi.advanceTimersByTimeAsync(250)
    await vi.waitFor(() => expect(sources).toHaveLength(2))
    await Effect.runPromise(Fiber.interrupt(fiber))
    vi.useRealTimers()
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
