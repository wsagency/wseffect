import { Effect, Queue, Stream } from 'effect'
import type { Schema } from 'effect'
import * as SchemaParser from 'effect/SchemaParser'
import { Subscription } from 'foldkit'

export type SignalTransport =
  | { readonly _tag: 'EventSource'; readonly url: string; readonly withCredentials?: boolean }
  | { readonly _tag: 'Fetch'; readonly url: string; readonly init?: RequestInit }
export type SignalOutcome<A> =
  | { readonly _tag: 'SignalPatch'; readonly value: A; readonly onlyIfMissing: boolean }
  | { readonly _tag: 'RejectedSignalPatch'; readonly reason: 'MalformedJson' | 'UnsupportedEvent' | 'UnsupportedOperation' | 'SchemaFailure' }
  | { readonly _tag: 'SignalTransportFailure'; readonly reason: 'Network' | 'Interrupted' }
export interface SignalBackoff { readonly delaysMs: ReadonlyArray<number>; readonly jitter: number }
type RejectedSignalPatch = Extract<SignalOutcome<never>, { readonly _tag: 'RejectedSignalPatch' }>
type SignalTransportFailure = Extract<SignalOutcome<never>, { readonly _tag: 'SignalTransportFailure' }>
const rejected = (reason: RejectedSignalPatch['reason']): RejectedSignalPatch => ({ _tag: 'RejectedSignalPatch', reason })
const networkFailure = (): SignalTransportFailure => ({ _tag: 'SignalTransportFailure', reason: 'Network' })

const defaultBackoff: SignalBackoff = { delaysMs: [250, 500, 1000, 2000, 4000], jitter: 0.2 }
type ParsedFrame = { readonly event: string; readonly data: string }

function decodeFrame<A>(schema: Schema.Codec<A, any, never, never>, frame: ParsedFrame): SignalOutcome<A> {
  if (frame.event !== 'datastar-patch-signals') return rejected('UnsupportedEvent')
  const signalLines: string[] = []
  let onlyIfMissing = false
  for (const line of frame.data.split('\n')) {
    if (line.startsWith('signals ')) {
      signalLines.push(line.slice(8))
    } else if (line.startsWith('onlyIfMissing ')) {
      if (line === 'onlyIfMissing true') onlyIfMissing = true
      else if (line !== 'onlyIfMissing false') return rejected('UnsupportedOperation')
    } else if (line.trim()) return rejected('UnsupportedOperation')
  }
  if (!signalLines.length) return rejected('UnsupportedOperation')
  let signals: unknown
  try {
    signals = JSON.parse(signalLines.join('\n'))
  } catch {
    return rejected('MalformedJson')
  }
  if (signals === null || typeof signals !== 'object' || Array.isArray(signals)) return rejected('UnsupportedOperation')
  const decoded = SchemaParser.decodeUnknownExit(schema)(signals)
  if (decoded._tag === 'Failure') return rejected('SchemaFailure')
  return { _tag: 'SignalPatch', value: decoded.value, onlyIfMissing }
}

/**
 * Subscribes to the JSON-only Datastar `patch-signals` SSE subset.
 *
 * Reconnection is managed by this Subscription for both transports: SSE `id:`
 * and `retry:` fields are ignored, and EventSource is closed on error so no
 * Last-Event-ID or server retry interval is used. Fetch reports unsupported
 * named events; EventSource can report the default `message` event, but its API
 * cannot observe arbitrary other named events.
 */
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
        if (!closed) Queue.offerUnsafe(queue, config.toMessage(outcome))
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
        const parseLine = (line: string) => {
          if (line.length === 0) {
            if (data.length && session === generation && online) emit(decodeFrame(config.schema, { event, data: data.join('\n') }))
            event = ''
            data = []
            return
          }
          if (line.startsWith('event:')) event = line.slice(6).replace(/^ /, '')
          else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
        }
        try {
          let done = false
          while (!closed && session === generation && online) {
            const item = await reader.read()
            if (item.done) {
              buffer += decoder.decode()
              done = true
            } else {
              buffer += decoder.decode(item.value, { stream: true })
            }
            while (true) {
              const boundary = buffer.search(/[\r\n]/)
              if (boundary < 0) break
              if (!done && buffer[boundary] === '\r' && boundary === buffer.length - 1) break
              const separatorLength = buffer[boundary] === '\r' && buffer[boundary + 1] === '\n' ? 2 : 1
              parseLine(buffer.slice(0, boundary))
              buffer = buffer.slice(boundary + separatorLength)
            }
            if (done) {
              if (buffer) parseLine(buffer)
              break
            }
          }
          if (!closed && session === generation && online) reconnect()
        } catch {
          if (!closed && session === generation && online) {
            emit(networkFailure())
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
            current.addEventListener('message', () => {
              if (session === generation && online) emit(rejected('UnsupportedEvent'))
            })
            current.onerror = () => {
              if (session === generation && online) {
                generation += 1
                emit(networkFailure())
                current.close()
                source = undefined
                reconnect()
              }
            }
          } catch {
            emit(networkFailure())
            reconnect()
          }
        } else {
          const current = new AbortController()
          controller = current
          void fetch(config.transport.url, { ...config.transport.init, signal: current.signal }).then((response) => {
            if (!response.ok || !response.body) throw 0
            if (session === generation) attempt = 0
            return consumeSse(response.body.getReader(), session)
          }).catch(() => {
            if (!closed && online && session === generation) {
              emit(networkFailure())
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
  ), { bufferSize: Number.POSITIVE_INFINITY })
  return Subscription.make<unknown, M>()((entry) => ({
    signal: entry({}, { modelToDependencies: () => ({}), dependenciesToStream: () => stream }),
  })).signal
}
