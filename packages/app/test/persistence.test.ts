import { Effect, Fiber, Option, Result, Schema, Stream } from 'effect'
import { TestClock } from 'effect/testing'
import { describe, expect, it, vi } from 'vitest'
import { persist, type PersistConfig } from '../src/persistence.js'

const schema = Schema.Struct({ count: Schema.Number })
const config = (overrides: Partial<PersistConfig<{ count: number }, string>> = {}) => ({
  key: 'counter', version: 1, schema, defaultValue: { count: 0 }, conflictPolicy: 'last-writer-wins-by-timestamp' as const,
  migrate: (_version: number, data: unknown) => Result.succeed(data as { count: number }), debounceMs: 50,
  toMessage: (value: { count: number }) => `value:${value.count}`,
  toFailureMessage: (failure: { _tag: 'PersistenceFailure'; operation: 'Restore' | 'Save' | 'Migrate' | 'Sync'; reason: string }) => `failure:${failure.operation}`,
  ...overrides,
})

describe('versioned persistence', () => {
  it('round trips a schema-validated envelope', async () => {
    localStorage.clear()
    const persistence = persist(config())
    await Effect.runPromise(persistence.save({ count: 7 }))
    expect(JSON.parse(localStorage.getItem('counter')!)).toEqual({ version: 1, writtenAt: expect.any(Number), data: { count: 7 } })
    expect(await Effect.runPromise(persistence.restore)).toEqual({ count: 7 })
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
    localStorage.setItem('counter', JSON.stringify({ version: 0, writtenAt: 1, data: { count: 9 } }))
    const migrate = (version: number, data: unknown) => {
      if (version !== 0 || data === null || typeof data !== 'object' || !('count' in data) || typeof data.count !== 'number') return Result.fail(data)
      return Result.succeed({ count: data.count + 1 })
    }
    const persistence = persist(config({ migrate }))
    expect(await Effect.runPromise(persistence.restore)).toEqual({ count: 10 })
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
})
