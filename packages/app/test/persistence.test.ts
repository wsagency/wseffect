import { Effect, Fiber, Result, Schema, Stream } from 'effect'
import { TestClock } from 'effect/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { persist, type PersistConfig } from '../src/persistence.js'

const schema = Schema.Struct({ count: Schema.Number })
const config = (overrides: Partial<PersistConfig<{ count: number }, string>> = {}) => ({
  key: 'counter', version: 1, schema, defaultValue: { count: 0 }, conflictPolicy: 'last-writer-wins-by-timestamp' as const,
  migrate: (_version: number, data: unknown) => Result.succeed(data as { count: number }), debounceMs: 50,
  toMessage: (value: { count: number }) => `value:${value.count}`,
  toFailureMessage: (failure: { _tag: 'PersistenceFailure'; operation: 'Restore' | 'Save' | 'Migrate' | 'Sync'; reason: string }) => `failure:${failure.operation}`,
  ...overrides,
})
let broadcastChannelDescriptor: PropertyDescriptor | undefined
beforeEach(() => {
  broadcastChannelDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'BroadcastChannel')
  Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: undefined })
})
afterEach(() => {
  if (broadcastChannelDescriptor === undefined) Reflect.deleteProperty(globalThis, 'BroadcastChannel')
  else Object.defineProperty(globalThis, 'BroadcastChannel', broadcastChannelDescriptor)
})

describe('versioned persistence', () => {
  it('round trips a schema-validated envelope', async () => {
    localStorage.clear()
    const persistence = persist(config())
    await Effect.runPromise(persistence.save({ count: 7 }))
    expect(JSON.parse(localStorage.getItem('counter')!)).toEqual({ version: 1, writtenAt: expect.any(Number), data: { count: 7 } })
    expect(await Effect.runPromise(persistence.restore)).toEqual({ count: 7 })
  })
  it('persists transform-codec values in encoded form for immediate and debounced saves', async () => {
    localStorage.clear()
    const transformed = persist(config({
      schema: Schema.Struct({ count: Schema.NumberFromString }),
    }))
    await Effect.runPromise(transformed.save({ count: 42 }))
    expect(JSON.parse(localStorage.getItem('counter')!).data).toEqual({ count: '42' })
    expect(await Effect.runPromise(transformed.restore)).toEqual({ count: 42 })

    const debounced = Effect.gen(function*() {
      const fiber = yield* Effect.forkChild(transformed.saveDebounced({ count: 43 }))
      yield* Effect.yieldNow
      yield* TestClock.adjust(50)
      yield* Fiber.join(fiber)
    }).pipe(Effect.provide(TestClock.layer()))
    await Effect.runPromise(debounced)
    expect(JSON.parse(localStorage.getItem('counter')!).data).toEqual({ count: '43' })
    expect(await Effect.runPromise(transformed.restore)).toEqual({ count: 43 })
  })
  it('validates migrated decoded values against the current codec without decoding them again', async () => {
    localStorage.setItem('counter', JSON.stringify({ version: 0, writtenAt: 1, data: 'legacy' }))
    const migrated = persist(config({
      schema: Schema.Struct({ count: Schema.NumberFromString.check(Schema.isGreaterThan(0)) }),
      migrate: () => Result.succeed({ count: 7 }),
    }))
    expect(await Effect.runPromise(migrated.restore)).toEqual({ count: 7 })

    const migratedFailures: string[] = []
    const invalid = persist(config({
      schema: Schema.Struct({ count: Schema.NumberFromString.check(Schema.isGreaterThan(0)) }),
      migrate: () => Result.succeed({ count: -1 }),
      toFailureMessage: (failure) => { migratedFailures.push(failure.operation); return `failure:${failure.operation}` },
    }))
    expect(await Effect.runPromise(invalid.restore)).toEqual({ count: 0 })
    expect(migratedFailures).toEqual(['Migrate'])
  })
  it('rejects an unencodable value before writing or broadcasting', async () => {
    const originalChannel = Object.getOwnPropertyDescriptor(globalThis, 'BroadcastChannel')
    const posted: unknown[] = []
    class RecordingBroadcastChannel extends EventTarget {
      postMessage(data: unknown) { posted.push(data) }
      close() {}
    }
    Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: RecordingBroadcastChannel })
    const key = 'counter'
    const setItem = vi.spyOn(localStorage, 'setItem')
    const failures: string[] = []
    const constrained = persist(config({
      schema: Schema.Struct({ count: Schema.NumberFromString.check(Schema.isGreaterThan(0)) }),
      migrate: () => Result.fail('unsupported'),
      toFailureMessage: (failure) => { failures.push(failure.operation); return `failure:${failure.operation}` },
    }))
    try {
      await Effect.runPromise(constrained.save({ count: -1 }))
      expect(setItem).not.toHaveBeenCalledWith(key, expect.any(String))
      expect(posted).toEqual([])
      expect(failures).toEqual(['Save'])
    } finally {
      setItem.mockRestore()
      if (originalChannel === undefined) Reflect.deleteProperty(globalThis, 'BroadcastChannel')
      else Object.defineProperty(globalThis, 'BroadcastChannel', originalChannel)
    }
  })
  it('decodes transformed BroadcastChannel and storage payloads once', async () => {
    localStorage.clear()
    const originalChannel = Object.getOwnPropertyDescriptor(globalThis, 'BroadcastChannel')
    const channels = new Set<TransformedBroadcastChannel>()
    class TransformedBroadcastChannel extends EventTarget {
      constructor() { super(); channels.add(this) }
      postMessage(data: unknown) {
        for (const channel of channels) {
          if (channel !== this) channel.dispatchEvent(new MessageEvent('message', { data }))
        }
      }
      close() { channels.delete(this) }
    }
    Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: TransformedBroadcastChannel })
    const transformedConfig = config({
      schema: Schema.Struct({ count: Schema.NumberFromString }),
    })
    const receiver = persist(transformedConfig)
    const sender = persist(transformedConfig)
    await Effect.runPromise(receiver.restore)
    const messages: string[] = []
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const fiber = Effect.runFork(Stream.runForEach(receiver.subscribe, (message) => Effect.sync(() => { messages.push(message) })))
    try {
      await vi.waitFor(() => expect(channels.size).toBe(1))
      await vi.waitFor(() => expect(addEventListener).toHaveBeenCalledWith('storage', expect.any(Function)))
      await Effect.runPromise(sender.save({ count: 42 }))
      const stored = localStorage.getItem('counter')!
      expect(JSON.parse(stored).data).toEqual({ count: '42' })
      window.dispatchEvent(new StorageEvent('storage', { key: 'counter', newValue: stored }))
      await vi.waitFor(() => expect(messages).toEqual(['value:42']))
      expect(messages).toEqual(['value:42'])
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
      channels.clear()
      addEventListener.mockRestore()
      if (originalChannel === undefined) Reflect.deleteProperty(globalThis, 'BroadcastChannel')
      else Object.defineProperty(globalThis, 'BroadcastChannel', originalChannel)
    }
  })


  it('recovers the supplied default from corrupt data', async () => {
    localStorage.setItem('counter', '{bad')
    const persistence = persist(config())
    expect(await Effect.runPromise(persistence.restore)).toEqual({ count: 0 })
  })
  it('maps quota errors into the failure callback', async () => {
    const onFailure = vi.fn((failure: { _tag: 'PersistenceFailure'; operation: 'Restore' | 'Save' | 'Migrate' | 'Sync'; reason: string }) => `failure:${failure.operation}`)
    const persistence = persist(config({ toFailureMessage: onFailure }))
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError') })
    try {
      await Effect.runPromise(persistence.save({ count: 1 }))
      expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({ _tag: 'PersistenceFailure', operation: 'Save' }))
    } finally {
      setItem.mockRestore()
    }
  })
  it('migrates a different version and validates the migrated value', async () => {
    localStorage.setItem('counter', JSON.stringify({ version: 0, writtenAt: 1, data: { legacyCount: 9 } }))
    const migrate = vi.fn((version: number, data: unknown) => {
      if (version !== 0 || data === null || typeof data !== 'object' || !('legacyCount' in data) || typeof data.legacyCount !== 'number') return Result.fail(data)
      return Result.succeed({ count: data.legacyCount + 1 })
    })
    const persistence = persist(config({ migrate }))
    expect(await Effect.runPromise(persistence.restore)).toEqual({ count: 10 })
    localStorage.setItem('counter', JSON.stringify({ version: 1, writtenAt: 2, data: { count: 11 } }))
    expect(await Effect.runPromise(persistence.restore)).toEqual({ count: 11 })
    expect(migrate).toHaveBeenCalledTimes(1)
    localStorage.setItem('counter', JSON.stringify({ version: 0, writtenAt: 3, data: { count: 1 } }))
    const onFailure = vi.fn((failure: { _tag: 'PersistenceFailure'; operation: 'Restore' | 'Save' | 'Migrate' | 'Sync'; reason: string }) => `failure:${failure.operation}`)
    const invalidMigration = persist(config({
      migrate: () => Result.succeed({ count: 'invalid' } as unknown as { count: number }),
      toFailureMessage: onFailure,
    }))
    expect(await Effect.runPromise(invalidMigration.restore)).toEqual({ count: 0 })
    expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({ _tag: 'PersistenceFailure', operation: 'Migrate' }))
  })

  it('saves only the latest debounced value after the quiet interval', async () => {
    localStorage.clear()
    const persistence = persist(config())
    const program = Effect.gen(function*() {
      const first = yield* Effect.forkChild(persistence.saveDebounced({ count: 1 }))
      yield* Effect.yieldNow
      yield* TestClock.adjust(25)
      const second = yield* Effect.forkChild(persistence.saveDebounced({ count: 2 }))
      yield* Effect.yieldNow
      yield* TestClock.adjust(50)
      yield* Fiber.join(first)
      yield* Fiber.join(second)
    }).pipe(Effect.provide(TestClock.layer()))
    await Effect.runPromise(program)
    expect(JSON.parse(localStorage.getItem('counter')!).data).toEqual({ count: 2 })
  })
  it('defaults and reports malformed, foreign, and schema-invalid envelopes', async () => {
    const failures: Array<{ _tag: string; operation: string; reason: string }> = []
    const failureConfig = config({
      toFailureMessage: (failure) => { failures.push(failure); return `failure:${failure.operation}` },
      migrate: () => Result.fail('unsupported version'),
    })
    const malformed = persist(failureConfig)
    localStorage.setItem('counter', '{bad')
    expect(await Effect.runPromise(malformed.restore)).toEqual({ count: 0 })
    expect(failures.at(-1)).toMatchObject({ operation: 'Restore' })
    localStorage.setItem('counter', JSON.stringify({ version: 1, writtenAt: 'invalid', data: { count: 1 } }))
    expect(await Effect.runPromise(malformed.restore)).toEqual({ count: 0 })
    expect(failures.at(-1)).toMatchObject({ operation: 'Restore' })


    const foreign = persist(failureConfig)
    localStorage.setItem('counter', JSON.stringify({ version: 0, writtenAt: 1, data: { count: 7 } }))
    expect(await Effect.runPromise(foreign.restore)).toEqual({ count: 0 })
    expect(failures.at(-1)).toMatchObject({ operation: 'Migrate' })

    const undecodable = persist(failureConfig)
    localStorage.setItem('counter', JSON.stringify({ version: 1, writtenAt: 1, data: { count: 'seven' } }))
    expect(await Effect.runPromise(undecodable.restore)).toEqual({ count: 0 })
    expect(failures.at(-1)).toMatchObject({ operation: 'Restore' })
  })

  it('reports unavailable storage as a restore failure and returns the default', async () => {
    const onFailure = vi.fn((failure: { _tag: 'PersistenceFailure'; operation: 'Restore' | 'Save' | 'Migrate' | 'Sync'; reason: string }) => `failure:${failure.operation}`)
    const persistence = persist(config({ toFailureMessage: onFailure }))
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError') })
    try {
      expect(await Effect.runPromise(persistence.restore)).toEqual({ count: 0 })
      expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({ _tag: 'PersistenceFailure', operation: 'Restore' }))
    } finally {
      getItem.mockRestore()
    }
  })

  it('delivers a restore failure once to the first subscriber after restore', async () => {
    localStorage.setItem('counter', JSON.stringify({ version: 1, writtenAt: 1, data: { count: 'invalid' } }))
    const persistence = persist(config({ toFailureMessage: () => 'failure:Restore' }))
    expect(await Effect.runPromise(persistence.restore)).toEqual({ count: 0 })

    const addEventListener = vi.spyOn(window, 'addEventListener')
    const firstMessages: string[] = []
    const first = Effect.runFork(Stream.runForEach(persistence.subscribe, (message) => Effect.sync(() => { firstMessages.push(message) })))
    let second: Fiber.Fiber<void, never> | undefined
    try {
      await vi.waitFor(() => expect(addEventListener).toHaveBeenCalledWith('storage', expect.any(Function)))
      await vi.waitFor(() => expect(firstMessages).toEqual(['failure:Restore']))

      const secondMessages: string[] = []
      second = Effect.runFork(Stream.runForEach(persistence.subscribe, (message) => Effect.sync(() => { secondMessages.push(message) })))
      await vi.waitFor(() => expect(addEventListener).toHaveBeenCalledTimes(2))
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(secondMessages).toEqual([])
    } finally {
      await Effect.runPromise(Fiber.interrupt(first))
      if (second !== undefined) await Effect.runPromise(Fiber.interrupt(second))
      addEventListener.mockRestore()
    }
  })
  it('reports foreign storage data and rejects incoming data that fails its schema', async () => {
    const failures: string[] = []
    const persistence = persist(config({
      migrate: () => Result.fail('unsupported version'),
      toFailureMessage: (failure) => { failures.push(failure.operation); return `failure:${failure.operation}` },
    }))
    localStorage.setItem('counter', JSON.stringify({ version: 1, writtenAt: 1, data: { count: 0 } }))
    const messages: string[] = []
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const fiber = Effect.runFork(Stream.runForEach(persistence.subscribe, (message) => Effect.sync(() => { messages.push(message) })))
    await vi.waitFor(() => expect(addEventListener).toHaveBeenCalledWith('storage', expect.any(Function)))
    window.dispatchEvent(new StorageEvent('storage', { key: 'counter', newValue: JSON.stringify({ version: 0, writtenAt: 2, data: { count: 1 } }) }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'counter', newValue: JSON.stringify({ version: 1, writtenAt: 3, data: { count: 'bad' } }) }))
    await vi.waitFor(() => expect(messages).toEqual(['failure:Sync', 'failure:Sync']))
    expect(failures).toEqual(['Sync', 'Sync'])
    await Effect.runPromise(Fiber.interrupt(fiber))
  })
  it('removes the storage listener when the subscription scope is interrupted', async () => {
    const persistence = persist(config())
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const removeEventListener = vi.spyOn(window, 'removeEventListener')
    const fiber = Effect.runFork(Stream.runForEach(persistence.subscribe, () => Effect.void))
    try {
      await vi.waitFor(() => expect(addEventListener).toHaveBeenCalledWith('storage', expect.any(Function)))
      const listener = addEventListener.mock.calls.find(([type]) => type === 'storage')![1]
      await Effect.runPromise(Fiber.interrupt(fiber))
      expect(removeEventListener).toHaveBeenCalledWith('storage', listener)
    } finally {
      addEventListener.mockRestore()
      removeEventListener.mockRestore()
    }
  })

  it('applies timestamp winners and preserves local data under local-wins', async () => {
    for (const policy of ['last-writer-wins-by-timestamp', 'local-wins'] as const) {
      localStorage.setItem('counter', JSON.stringify({ version: 1, writtenAt: 10, data: { count: 1 } }))
      const persistence = persist(config({ conflictPolicy: policy }))
      await Effect.runPromise(persistence.restore)
      const messages: string[] = []
      const addEventListener = vi.spyOn(window, 'addEventListener')
      const fiber = Effect.runFork(Stream.runForEach(persistence.subscribe, (message) => Effect.sync(() => { messages.push(message) })))
      try {
        await vi.waitFor(() => expect(addEventListener).toHaveBeenCalledWith('storage', expect.any(Function)))
        window.dispatchEvent(new StorageEvent('storage', { key: 'counter', newValue: JSON.stringify({ version: 1, writtenAt: 11, data: { count: 2 } }) }))
        if (policy === 'last-writer-wins-by-timestamp') {
          await vi.waitFor(() => expect(messages).toEqual(['value:2']))
        } else {
          expect(messages).toEqual([])
        }
      } finally {
        await Effect.runPromise(Fiber.interrupt(fiber))
        addEventListener.mockRestore()
      }
    }
  })

  it('keeps local data when an incoming timestamp ties for either policy', async () => {
    for (const policy of ['last-writer-wins-by-timestamp', 'local-wins'] as const) {
      localStorage.setItem('counter', JSON.stringify({ version: 1, writtenAt: 10, data: { count: 1 } }))
      const persistence = persist(config({ conflictPolicy: policy }))
      await Effect.runPromise(persistence.restore)
      const messages: string[] = []
      const addEventListener = vi.spyOn(window, 'addEventListener')
      const fiber = Effect.runFork(Stream.runForEach(persistence.subscribe, (message) => Effect.sync(() => { messages.push(message) })))
      try {
        await vi.waitFor(() => expect(addEventListener).toHaveBeenCalledWith('storage', expect.any(Function)))
        window.dispatchEvent(new StorageEvent('storage', { key: 'counter', newValue: JSON.stringify({ version: 1, writtenAt: 10, data: { count: 2 } }) }))
        expect(messages).toEqual([])
      } finally {
        await Effect.runPromise(Fiber.interrupt(fiber))
        addEventListener.mockRestore()
      }
    }
  })
  it('falls back to storage sync when BroadcastChannel construction throws', async () => {
    const originalChannel = Object.getOwnPropertyDescriptor(globalThis, 'BroadcastChannel')
    class BrokenBroadcastChannel {
      constructor() { throw new Error('BroadcastChannel unavailable') }
    }
    Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: BrokenBroadcastChannel })
    localStorage.setItem('counter', JSON.stringify({ version: 1, writtenAt: 1, data: { count: 0 } }))
    const persistence = persist(config())
    const messages: string[] = []
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const fiber = Effect.runFork(Stream.runForEach(persistence.subscribe, (message) => Effect.sync(() => { messages.push(message) })))
    try {
      await vi.waitFor(() => expect(addEventListener).toHaveBeenCalledWith('storage', expect.any(Function)))
      window.dispatchEvent(new StorageEvent('storage', { key: 'counter', newValue: JSON.stringify({ version: 1, writtenAt: 2, data: { count: 1 } }) }))
      await vi.waitFor(() => expect(messages).toEqual(['value:1']))
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
      addEventListener.mockRestore()
      if (originalChannel === undefined) Reflect.deleteProperty(globalThis, 'BroadcastChannel')
      else Object.defineProperty(globalThis, 'BroadcastChannel', originalChannel)
    }
  })

  it('ignores postMessage errors and receives the authoritative storage write', async () => {
    const originalChannel = Object.getOwnPropertyDescriptor(globalThis, 'BroadcastChannel')
    class BrokenBroadcastChannel extends EventTarget {
      postMessage() { throw new Error('BroadcastChannel postMessage failed') }
      close() {}
    }
    Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: BrokenBroadcastChannel })
    localStorage.setItem('counter', JSON.stringify({ version: 1, writtenAt: 1, data: { count: 0 } }))
    const failures: string[] = []
    const persistenceConfig = config({
      toFailureMessage: (failure) => { failures.push(failure.operation); return `failure:${failure.operation}` },
    })
    const receiver = persist(persistenceConfig)
    const sender = persist(persistenceConfig)
    await Effect.runPromise(receiver.restore)
    const messages: string[] = []
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const fiber = Effect.runFork(Stream.runForEach(receiver.subscribe, (message) => Effect.sync(() => { messages.push(message) })))
    try {
      await vi.waitFor(() => expect(addEventListener).toHaveBeenCalledWith('storage', expect.any(Function)))
      await Effect.runPromise(sender.save({ count: 2 }))
      const envelope = localStorage.getItem('counter')!
      window.dispatchEvent(new StorageEvent('storage', { key: 'counter', newValue: envelope }))
      await vi.waitFor(() => expect(messages).toEqual(['value:2']))
      expect(failures).not.toContain('Save')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
      addEventListener.mockRestore()
      if (originalChannel === undefined) Reflect.deleteProperty(globalThis, 'BroadcastChannel')
      else Object.defineProperty(globalThis, 'BroadcastChannel', originalChannel)
    }
  })

  it('applies a duplicate envelope once across transports and a lower-timestamp local save', async () => {
    const originalChannel = Object.getOwnPropertyDescriptor(globalThis, 'BroadcastChannel')
    const channels = new Set<FakeBroadcastChannel>()
    class FakeBroadcastChannel extends EventTarget {
      constructor() {
        super()
        channels.add(this)
      }
      postMessage(data: unknown) {
        for (const channel of channels) {
          if (channel !== this) channel.dispatchEvent(new MessageEvent('message', { data }))
        }
      }
      close() { channels.delete(this) }
    }
    Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: FakeBroadcastChannel })
    localStorage.setItem('counter', JSON.stringify({ version: 1, writtenAt: 10, data: { count: 1 } }))
    const persistence = persist(config())
    await Effect.runPromise(persistence.restore)
    const messages: string[] = []
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const fiber = Effect.runFork(Stream.runForEach(persistence.subscribe, (message) => Effect.sync(() => { messages.push(message) })))
    const duplicate = { version: 1, writtenAt: 20, data: { count: 2 } }
    const sender = new FakeBroadcastChannel()
    try {
      await vi.waitFor(() => expect(channels.size).toBe(2))
      await vi.waitFor(() => expect(addEventListener).toHaveBeenCalledWith('storage', expect.any(Function)))
      sender.postMessage(duplicate)
      await vi.waitFor(() => expect(messages).toEqual(['value:2']))
      await Effect.runPromise(persistence.save({ count: 3 }).pipe(Effect.provide(TestClock.layer())))
      sender.postMessage(duplicate)
      window.dispatchEvent(new StorageEvent('storage', { key: 'counter', newValue: JSON.stringify(duplicate) }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(messages).toEqual(['value:2'])
      expect(addEventListener).toHaveBeenCalledWith('storage', expect.any(Function))
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
      sender.close()
      channels.clear()
      addEventListener.mockRestore()
      if (originalChannel === undefined) Reflect.deleteProperty(globalThis, 'BroadcastChannel')
      else Object.defineProperty(globalThis, 'BroadcastChannel', originalChannel)
    }
  })
})
