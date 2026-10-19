import { Effect, Option, Queue, Result, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'
import { ServiceWorker } from './pwa/serviceWorker.js'

const VersionInfo = Schema.Struct({ buildId: Schema.String })

interface VersionPollConfig<Message> {
  readonly intervalMs: number
  readonly runningBuildId: string
  readonly newVersionAvailable: (buildId: string) => Message
}

function pollStream<Message>(config: VersionPollConfig<Message>): Stream.Stream<Message> {
  const triggers = Stream.callback<void>((queue) => Effect.gen(function*() {
    const emit = () => Queue.offerUnsafe(queue, undefined)
    emit()
    const visibilityChanged = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') emit()
    }
    const online = () => emit()
    yield* Effect.acquireRelease(
      Effect.sync(() => {
        if (typeof window === 'undefined') return () => {}
        window.addEventListener('online', online)
        if (typeof document !== 'undefined') document.addEventListener('visibilitychange', visibilityChanged)
        return () => {
          window.removeEventListener('online', online)
          if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', visibilityChanged)
        }
      }),
      (release) => Effect.sync(release),
    )
    yield* Effect.forkScoped(Effect.forever(Effect.andThen(Effect.sleep(config.intervalMs), Effect.sync(emit))))
    return yield* Effect.never
  }))
  return triggers.pipe(
    Stream.mapEffect(() => Effect.gen(function*() {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return Result.fail(undefined)
      if (typeof navigator !== 'undefined' && !navigator.onLine) return Result.fail(undefined)
      const response = yield* Effect.result(Effect.tryPromise({
        try: () => fetch('/version.json', { cache: 'no-store' }),
        catch: (cause) => cause,
      }))
      if (Result.isFailure(response) || !response.success.ok) return Result.fail(undefined)
      const body = yield* Effect.result(Effect.tryPromise({
        try: () => response.success.json(),
        catch: (cause) => cause,
      }))
      if (Result.isFailure(body)) return Result.fail(undefined)
      const version = Option.getOrUndefined(Schema.decodeUnknownOption(VersionInfo)(body.success))
      if (version === undefined || version.buildId === config.runningBuildId) return Result.fail(undefined)
      const serviceWorker = yield* Effect.serviceOption(ServiceWorker)
      if (Option.isSome(serviceWorker)) yield* Effect.option(serviceWorker.value.checkForUpdate)
      return Result.succeed(config.newVersionAvailable(version.buildId))
    })),
    Stream.filterMap((result) => result),
  )
}

export function versionPollSubscription<Message>(config: VersionPollConfig<Message>) {
  return Subscription.make<unknown, Message>()((entry) => ({
    'wseffect:version-poll': entry({}, {
      modelToDependencies: () => ({}),
      dependenciesToStream: () => pollStream(config),
    }),
  }))
}
