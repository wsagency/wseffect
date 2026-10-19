import { Effect, Fiber, Stream } from 'effect'
import { describe, expect, it, vi } from 'vitest'
import { PwaEvent } from '../src/kit/messages.js'
import { makeServiceWorkerLayer, ServiceWorker, ServiceWorkerUpdateError } from '../src/pwa/serviceWorker.js'

const service = <A>(effect: Effect.Effect<A, unknown, ServiceWorker>, layer: ReturnType<typeof makeServiceWorkerLayer>) =>
  Effect.runPromise(effect.pipe(Effect.provide(layer)))

describe('ServiceWorker', () => {
  it('emits initial online state and registration callbacks', async () => {
    let callbacks: Parameters<typeof import('virtual:pwa-register').registerSW>[0] | undefined
    const updateSW = vi.fn(async () => {})
    const register = vi.fn((options?: Parameters<typeof import('virtual:pwa-register').registerSW>[0]) => {
      callbacks = options
      return updateSW
    })
    const layer = makeServiceWorkerLayer(register)
    const result = Effect.gen(function*() {
      const worker = yield* ServiceWorker
      const fiber = yield* Effect.forkChild(Stream.runCollect(Stream.take(worker.events, 4)))
      callbacks?.onOfflineReady?.()
      callbacks?.onNeedRefresh?.()
      callbacks?.onRegisterError?.(new Error('registration failed'))
      return yield* Fiber.join(fiber)
    })
    const events = await service(result, layer)
    expect(Array.from(events)).toEqual([
      PwaEvent.ChangedOnlineStatus({ isOnline: true }),
      PwaEvent.OfflineReady(),
      PwaEvent.UpdateAvailable(),
      PwaEvent.RegisterFailed({ reason: 'registration failed' }),
    ])
  })

  it('tracks a service worker registration and checks for an update', async () => {
    const registration = { update: vi.fn(async () => undefined) }
    const layer = makeServiceWorkerLayer((options) => {
      options?.onRegisteredSW?.('/sw.js', registration as unknown as ServiceWorkerRegistration)
      return async () => {}
    })
    await service(Effect.gen(function*() {
      const worker = yield* ServiceWorker
      expect(yield* worker.hasRegistration).toBe(true)
      yield* worker.checkForUpdate
      expect(registration.update).toHaveBeenCalledTimes(1)
    }), layer)
  })

  it('reports update activation failures as ServiceWorkerUpdateError', async () => {
    const layer = makeServiceWorkerLayer(() => async () => { throw new Error('activation failed') })
    const result = service(Effect.gen(function*() {
      const worker = yield* ServiceWorker
      yield* worker.applyUpdate
    }), layer)
    await expect(result).rejects.toMatchObject({ _tag: 'ServiceWorkerUpdateError' } satisfies Partial<ServiceWorkerUpdateError>)
  })
})
