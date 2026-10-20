import { Effect, Queue, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'

export type SignalTransport =
  | { readonly _tag: 'EventSource'; readonly url: string; readonly withCredentials?: boolean }
  | { readonly _tag: 'Fetch'; readonly url: string; readonly init?: RequestInit }
export type SignalOutcome<A> =
  | { readonly _tag: 'SignalPatch'; readonly value: A; readonly onlyIfMissing: boolean }
  | { readonly _tag: 'RejectedSignalPatch'; readonly reason: 'MalformedJson' | 'UnsupportedEvent' | 'UnsupportedOperation' | 'SchemaFailure' }
  | { readonly _tag: 'SignalTransportFailure'; readonly reason: 'Network' | 'Interrupted' }
export interface SignalBackoff { readonly delaysMs: ReadonlyArray<number>; readonly jitter: number }

const defaultBackoff: SignalBackoff = { delaysMs: [250, 500, 1000, 2000, 4000], jitter: 0.2 }
type ParsedFrame = { readonly event: string; readonly data: string }

function decodeFrame<A>(schema: Schema.Codec<A, any, never, never>, frame: ParsedFrame): SignalOutcome<A> {
  if (frame.event !== 'datastar-patch-signals') return { _tag: 'RejectedSignalPatch', reason: 'UnsupportedEvent' }
  let signals: unknown
  let onlyIfMissing = false
  let sawSignals = false
  for (const line of frame.data.split('\n')) {
    if (line.startsWith('signals ')) {
      if (sawSignals) return { _tag: 'RejectedSignalPatch', reason: 'UnsupportedOperation' }
      sawSignals = true
      try { signals = JSON.parse(line.slice(8)) } catch { return { _tag: 'RejectedSignalPatch', reason: 'MalformedJson' } }
      if (signals === null || typeof signals !== 'object' || Array.isArray(signals)) return { _tag: 'RejectedSignalPatch', reason: 'UnsupportedOperation' }
    } else if (line.startsWith('onlyIfMissing ')) {
      if (line === 'onlyIfMissing true') onlyIfMissing = true
      else if (line !== 'onlyIfMissing false') return { _tag: 'RejectedSignalPatch', reason: 'UnsupportedOperation' }
    } else if (line.trim()) return { _tag: 'RejectedSignalPatch', reason: 'UnsupportedOperation' }
  }
  if (!sawSignals) return { _tag: 'RejectedSignalPatch', reason: 'UnsupportedOperation' }
  try {
    return { _tag: 'SignalPatch', value: Schema.decodeUnknownSync(schema)(signals), onlyIfMissing }
  } catch {
    return { _tag: 'RejectedSignalPatch', reason: 'SchemaFailure' }
  }
}

export function signalSubscription<A, M>(config: {
  readonly schema: Schema.Codec<A, any, never, never>
  readonly transport: SignalTransport
  readonly backoff?: SignalBackoff
  readonly toMessage: (outcome: SignalOutcome<A>) => M
}): Subscription.Subscription<unknown, M, Record<string, never>> {
  const backoff = config.backoff ?? defaultBackoff
  const stream = Stream.callback<M>((queue) => Effect.acquireRelease(
    Effect.sync(() => {
      let closed = false
      let timer: ReturnType<typeof setTimeout> | undefined
      let source: EventSource | undefined
      let controller: AbortController | undefined
      let attempt = 0
      let online = navigator.onLine
      let generation = 0
      const emit = (outcome: SignalOutcome<A>) => {
        if (!closed) Effect.runSync(Queue.offer(queue, config.toMessage(outcome)))
      }
      const reconnect = () => {
        if (closed || !online) return
        if (timer !== undefined) clearTimeout(timer)
        const index = Math.min(attempt, Math.max(0, backoff.delaysMs.length - 1))
        const base = backoff.delaysMs[index] ?? 0
        attempt += 1
        const jitter = Math.max(0, Math.min(1, backoff.jitter))
        const factor = 1 + (Math.random() * 2 - 1) * jitter
        timer = setTimeout(connect, Math.max(0, Math.floor(base * factor)))
      }
      const onlineHandler = () => {
        if (!online) {
          online = true
          attempt = 0
          connect()
        }
      }
      const offlineHandler = () => {
        online = false
        generation += 1
        if (timer !== undefined) clearTimeout(timer)
        source?.close()
        source = undefined
        controller?.abort()
        controller = undefined
      }
      const consumeSse = async (reader: ReadableStreamDefaultReader<Uint8Array>, session: number) => {
        const decoder = new TextDecoder()
        let buffer = ''
        let event = ''
        let data: string[] = []
        try {
          while (!closed && session === generation && online) {
            const item = await reader.read()
            if (item.done) break
            buffer += decoder.decode(item.value, { stream: true })
            let boundary = buffer.indexOf('\n')
            while (boundary >= 0) {
              const line = buffer.slice(0, boundary).replace(/\r$/, '')
              buffer = buffer.slice(boundary + 1)
              if (!line) {
                if (data.length && session === generation && online) emit(decodeFrame(config.schema, { event, data: data.join('\n') }))
                event = ''
                data = []
              } else if (line.startsWith('event:')) event = line.slice(6).trim()
              else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
              boundary = buffer.indexOf('\n')
            }
          }
          if (!closed && session === generation && online) reconnect()
        } catch {
          if (!closed && session === generation && online) {
            emit({ _tag: 'SignalTransportFailure', reason: 'Network' })
            reconnect()
          }
        } finally { reader.releaseLock() }
      }
      const connect = () => {
        const session = ++generation
        if (config.transport._tag === 'EventSource') {
          try {
            const current = new EventSource(config.transport.url, { withCredentials: config.transport.withCredentials })
            source = current
            current.onopen = () => { if (session === generation) attempt = 0 }
            current.addEventListener('datastar-patch-signals', (event) => {
              if (session === generation && online) {
                emit(decodeFrame(config.schema, { event: 'datastar-patch-signals', data: (event as MessageEvent<string>).data }))
              }
            })
            current.onerror = () => {
              if (session === generation && online) {
                emit({ _tag: 'SignalTransportFailure', reason: 'Network' })
                current.close()
                source = undefined
                reconnect()
              }
            }
          } catch {
            emit({ _tag: 'SignalTransportFailure', reason: 'Network' })
            reconnect()
          }
        } else {
          const current = new AbortController()
          controller = current
          void fetch(config.transport.url, { ...config.transport.init, signal: current.signal }).then((response) => {
            if (!response.ok || !response.body) throw new Error('Network')
            if (session === generation) attempt = 0
            return consumeSse(response.body.getReader(), session)
          }).catch(() => {
            if (!closed && online && session === generation) {
              emit({ _tag: 'SignalTransportFailure', reason: 'Network' })
              reconnect()
            }
          })
        }
      }
      window.addEventListener('online', onlineHandler)
      window.addEventListener('offline', offlineHandler)
      if (online) connect()
      return () => {
        closed = true
        if (timer !== undefined) clearTimeout(timer)
        generation += 1
        source?.close()
        controller?.abort()
        window.removeEventListener('online', onlineHandler)
        window.removeEventListener('offline', offlineHandler)
      }
    }),
    (release) => Effect.sync(release),
  ))
  return Subscription.make<unknown, M>()((entry) => ({
    signal: entry({}, { modelToDependencies: () => ({}), dependenciesToStream: () => stream }),
  })).signal
}
