import { Effect, Fiber, Result, Schema, Stream } from 'effect'
import { persist } from '../../src/persistence.js'


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
    const fiber = Effect.runFork(Stream.runForEach(persistence.subscribe, (message) => Effect.sync(() => {
      window.dispatchEvent(new CustomEvent('persist-message', { detail: message }))
    })))
    return {
      save: (value: string) => Effect.runPromise(persistence.save({ value })),
      restore: () => Effect.runPromise(persistence.restore),
      stop: () => Effect.runPromise(Fiber.interrupt(fiber)),
    }
  },
})
