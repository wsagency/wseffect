import { Effect, Fiber, Result, Schema, Stream } from 'effect'
import { persist } from '../../src/persistence.js'

// Report readiness only after the transport's actual listener has been registered.
function signalOnSubscribeListeners(key: string): () => void {
  const channelName = `wseffect:persist:${key}`
  const windowDescriptor = Object.getOwnPropertyDescriptor(window, 'addEventListener')
  const originalWindowAdd = window.addEventListener
  const Channel = typeof window.BroadcastChannel === 'undefined' ? undefined : window.BroadcastChannel
  const channelDescriptor = Channel === undefined
    ? undefined
    : Object.getOwnPropertyDescriptor(Channel.prototype, 'addEventListener')
  const originalChannelAdd = Channel?.prototype.addEventListener
  let restored = false
  let signalled = false
  const restore = () => {
    if (restored) return
    restored = true
    if (windowDescriptor === undefined) Reflect.deleteProperty(window, 'addEventListener')
    else Object.defineProperty(window, 'addEventListener', windowDescriptor)
    if (Channel !== undefined) {
      if (channelDescriptor === undefined) Reflect.deleteProperty(Channel.prototype, 'addEventListener')
      else Object.defineProperty(Channel.prototype, 'addEventListener', channelDescriptor)
    }
  }
  const announce = () => {
    if (signalled) return
    signalled = true
    restore()
    window.dispatchEvent(new Event('persist-subscribed'))
  }

  Object.defineProperty(window, 'addEventListener', {
    configurable: true,
    value: function(this: Window, type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
      Reflect.apply(originalWindowAdd, this, [type, listener, options])
      if (type === 'storage' && Channel === undefined) announce()
    },
  })
  if (Channel !== undefined && originalChannelAdd !== undefined) {
    Object.defineProperty(Channel.prototype, 'addEventListener', {
      configurable: true,
      value: function(this: BroadcastChannel, type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
        Reflect.apply(originalChannelAdd, this, [type, listener, options])
        if (type === 'message' && this.name === channelName) announce()
      },
    })
  }
  return restore
}

const Stored = Schema.Struct({ value: Schema.String })

Object.assign(window, {
  startPersistence(key: string) {
    const persistence = persist({
      key,
      version: 1,
      schema: Stored,
      defaultValue: { value: '' },
      conflictPolicy: 'last-writer-wins-by-timestamp' as const,
      migrate: (_version: number, data: unknown) => {
        const decoded = Schema.decodeUnknownOption(Stored)(data)
        return decoded._tag === 'Some' ? Result.succeed(decoded.value) : Result.fail(data)
      },
      debounceMs: 25,
      toMessage: (value: { value: string }) => value,
      toFailureMessage: (_failure: { _tag: 'PersistenceFailure'; operation: 'Restore' | 'Save' | 'Migrate' | 'Sync'; reason: string }) => ({ value: 'failure' }),
    })
    const restoreReadinessHooks = signalOnSubscribeListeners(key)
    const fiber = Effect.runFork(Stream.runForEach(persistence.subscribe, (message) => Effect.sync(() => {
      window.dispatchEvent(new CustomEvent('persist-message', { detail: message }))
    })))
    return {
      save: (value: string) => Effect.runPromise(persistence.save({ value })),
      restore: () => Effect.runPromise(persistence.restore),
      stop: () => {
        restoreReadinessHooks()
        return Effect.runPromise(Fiber.interrupt(fiber))
      },
    }
  },
})
