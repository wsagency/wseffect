import { Context, Data, Effect, Layer, Queue, Stream } from 'effect'
import { registerSW } from 'virtual:pwa-register'
import { PwaEvent } from '../kit/messages.js'

export class ServiceWorkerUpdateError extends Data.TaggedError('ServiceWorkerUpdateError')<{
  readonly cause: unknown
}> {}

interface ServiceWorkerApi {
  readonly events: Stream.Stream<typeof PwaEvent.Type>
  readonly hasRegistration: Effect.Effect<boolean>
  readonly checkForUpdate: Effect.Effect<void, ServiceWorkerUpdateError>
  readonly applyUpdate: Effect.Effect<void, ServiceWorkerUpdateError>
}

export class ServiceWorker extends Context.Service<ServiceWorker, ServiceWorkerApi>()('wseffect/ServiceWorker') {
  static get layer(): Layer.Layer<ServiceWorker> {
    return makeServiceWorkerLayer(registerSW)
  }
}

export function makeServiceWorkerLayer(register: typeof registerSW): Layer.Layer<ServiceWorker> {
  return Layer.effect(ServiceWorker, Effect.gen(function*() {
    const queue = yield* Queue.unbounded<typeof PwaEvent.Type>()
    let registration: ServiceWorkerRegistration | undefined
    Queue.offerUnsafe(queue, PwaEvent.ChangedOnlineStatus({
      isOnline: typeof navigator === 'undefined' || navigator.onLine,
    }))
    const updateSW = register({
      immediate: true,
      onOfflineReady: () => Queue.offerUnsafe(queue, PwaEvent.OfflineReady()),
      onNeedRefresh: () => Queue.offerUnsafe(queue, PwaEvent.UpdateAvailable()),
      onRegisterError: (error) => Queue.offerUnsafe(queue, PwaEvent.RegisterFailed({
        reason: error instanceof Error ? error.message : String(error),
      })),
      onRegisteredSW: (_url, registered) => {
        if (registered !== undefined) registration = registered
      },
    })
    yield* Effect.acquireRelease(
      Effect.sync(() => {
        if (typeof window === 'undefined') return () => {}
        const online = () => Queue.offerUnsafe(queue, PwaEvent.ChangedOnlineStatus({ isOnline: true }))
        const offline = () => Queue.offerUnsafe(queue, PwaEvent.ChangedOnlineStatus({ isOnline: false }))
        window.addEventListener('online', online)
        window.addEventListener('offline', offline)
        return () => {
          window.removeEventListener('online', online)
          window.removeEventListener('offline', offline)
        }
      }),
      (release) => Effect.sync(release),
    )
    const checkForUpdate = Effect.suspend(() => {
      const current = registration
      if (current === undefined) return Effect.succeed(undefined)
      return Effect.as(Effect.tryPromise({
        try: () => current.update(),
        catch: (cause) => new ServiceWorkerUpdateError({ cause }),
      }), undefined)
    })
    const applyUpdate = Effect.tryPromise({
      try: () => updateSW(true),
      catch: (cause) => new ServiceWorkerUpdateError({ cause }),
    })
    return {
      events: Stream.fromQueue(queue),
      hasRegistration: Effect.sync(() => registration !== undefined),
      checkForUpdate,
      applyUpdate,
    }
  }))
}
