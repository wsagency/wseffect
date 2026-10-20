import { Cause, Effect, Queue, Result, Stream } from 'effect'
import * as Exit from 'effect/Exit'
import * as SchemaParser from 'effect/SchemaParser'
import type * as Schema from 'effect/Schema'

export type ConflictPolicy = 'last-writer-wins-by-timestamp' | 'local-wins'
export type PersistenceFailure = {
  readonly _tag: 'PersistenceFailure'
  readonly operation: 'Restore' | 'Save' | 'Migrate' | 'Sync'
  readonly reason: string
}
export interface PersistConfig<A, M> {
  readonly key: string
  readonly version: number
  readonly schema: Schema.Codec<A, any, never, never>
  readonly defaultValue: A
  readonly conflictPolicy: ConflictPolicy
  readonly migrate: (storedVersion: number, data: unknown) => Result.Result<A, unknown>
  readonly debounceMs: number
  readonly toMessage: (value: A) => M
  readonly toFailureMessage: (failure: PersistenceFailure) => M
}
export interface Persistence<A, M> {
  readonly restore: Effect.Effect<A>
  readonly save: (value: A) => Effect.Effect<void>
  readonly saveDebounced: (value: A) => Effect.Effect<void>
  readonly subscribe: Stream.Stream<M>
}

type Envelope = { readonly version: number; readonly writtenAt: number; readonly data: unknown }

function isEnvelope(value: unknown): value is Envelope {
  if (typeof value !== 'object' || value === null) return false
  const envelope = value as Record<string, unknown>
  return Object.hasOwn(envelope, 'version') &&
    typeof envelope.version === 'number' &&
    Object.hasOwn(envelope, 'writtenAt') &&
    typeof envelope.writtenAt === 'number' &&
    Object.hasOwn(envelope, 'data')
}

export function persist<A, M>(config: PersistConfig<A, M>): Persistence<A, M> {
  let localWrittenAt = -Infinity
  let debounceGeneration = 0
  const listeners = new Set<Queue.Queue<M, Cause.Done>>()
  const emit = (message: M) => { for (const listener of listeners) Queue.offerUnsafe(listener, message) }
  const failure = (operation: PersistenceFailure['operation'], reason: string) =>
    config.toFailureMessage({ _tag: 'PersistenceFailure', operation, reason })

  const decodeData = (value: unknown): A | undefined => {
    const decoded = SchemaParser.decodeUnknownExit(config.schema)(value)
    return Exit.isSuccess(decoded) ? decoded.value : undefined
  }
  const decodeEnvelope = (raw: string): Envelope | undefined => {
    let parsed: unknown
    try { parsed = JSON.parse(raw) } catch { return undefined }
    if (!isEnvelope(parsed) || decodeData(parsed.data) === undefined) return undefined
    return parsed
  }

  const restore: Effect.Effect<A> = Effect.sync(() => {
    let raw: string | null
    try { raw = localStorage.getItem(config.key) } catch (cause) {
      emit(failure('Restore', String(cause)))
      return config.defaultValue
    }
    if (raw === null) return config.defaultValue
    const envelope = decodeEnvelope(raw)
    if (envelope === undefined) {
      emit(failure('Restore', 'Malformed or schema-invalid envelope'))
      return config.defaultValue
    }
    let data: A | undefined
    if (envelope.version === config.version) data = decodeData(envelope.data)
    else {
      const migrated = config.migrate(envelope.version, envelope.data)
      if (Result.isFailure(migrated)) {
        emit(failure('Migrate', 'Unsupported stored version'))
      } else {
        data = decodeData(migrated.success)
        if (data === undefined) emit(failure('Migrate', 'Migrated value failed current schema'))
      }
    }
    if (data === undefined) {
      if (envelope.version === config.version) emit(failure('Restore', 'Stored value failed current schema'))
      return config.defaultValue
    }
    localWrittenAt = envelope.writtenAt
    return data
  })

  const save = (value: A): Effect.Effect<void> => Effect.gen(function*() {
    const writtenAt = yield* Effect.clockWith((clock) => clock.currentTimeMillis)
    const envelope = { version: config.version, writtenAt, data: value }
    try {
      localStorage.setItem(config.key, JSON.stringify(envelope))
      localWrittenAt = writtenAt
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(`wseffect:persist:${config.key}`)
        channel.postMessage(envelope)
        channel.close()
      }
    } catch (cause) {
      emit(failure('Save', String(cause)))
    }
  })

  const saveDebounced = (value: A): Effect.Effect<void> => Effect.gen(function*() {
    const generation = yield* Effect.sync(() => ++debounceGeneration)
    yield* Effect.sleep(config.debounceMs)
    if (generation === debounceGeneration) yield* save(value)
  })

  const subscribe: Stream.Stream<M> = Stream.callback<M>((queue) => Effect.gen(function*() {
    yield* Effect.acquireRelease(
      Effect.sync(() => {
        listeners.add(queue)
        const applyIncoming = (input: unknown) => {
          if (!isEnvelope(input)) { emit(failure('Sync', 'Malformed remote envelope')); return }
          const envelope = input
          if (envelope.version !== config.version) { emit(failure('Sync', 'Foreign remote version')); return }
          const data = decodeData(envelope.data)
          if (data === undefined) { emit(failure('Sync', 'Remote value failed current schema')); return }
          const wins = config.conflictPolicy === 'last-writer-wins-by-timestamp' && envelope.writtenAt > localWrittenAt
          if (wins) {
            localWrittenAt = envelope.writtenAt
            Queue.offerUnsafe(queue, config.toMessage(data))
          }
        }
        let channel: BroadcastChannel | undefined
        const storage = (event: StorageEvent) => {
          if (event.key !== config.key || event.newValue === null) return
          const incoming = decodeEnvelope(event.newValue)
          if (incoming === undefined) { emit(failure('Sync', 'Malformed storage event')); return }
          applyIncoming(incoming)
        }
        if (typeof BroadcastChannel !== 'undefined') {
          channel = new BroadcastChannel(`wseffect:persist:${config.key}`)
          channel.addEventListener('message', (event: MessageEvent<unknown>) => applyIncoming(event.data))
        }
        if (typeof window !== 'undefined') {
          // WebKit delays cross-document storage events until this document accesses localStorage.
          try { window.localStorage.getItem(config.key) } catch {}
          window.addEventListener('storage', storage)
        }
        return () => {
          listeners.delete(queue)
          channel?.close()
          if (typeof window !== 'undefined') window.removeEventListener('storage', storage)
        }
      }),
      (release) => Effect.sync(release),
    )
    return yield* Effect.never
  }))
  return { restore, save, saveDebounced, subscribe }
}
