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
      const fiber = yield* Effect.forkChild(Stream.runCollect(Stream.take(worker.events, 5)))
      callbacks?.onOfflineReady?.()
      callbacks?.onNeedRefresh?.()
      callbacks?.onRegisterError?.(new Error('registration failed'))
      window.dispatchEvent(new Event('offline'))
      return yield* Fiber.join(fiber)
    })
    const events = await Effect.runPromise(result.pipe(Effect.provide(layer)))
    expect(Array.from(events)).toEqual([
      PwaEvent.ChangedOnlineStatus({ isOnline: true }),
      PwaEvent.OfflineReady(),
      PwaEvent.UpdateAvailable(),
      PwaEvent.RegisterFailed({ reason: 'registration failed' }),
      PwaEvent.ChangedOnlineStatus({ isOnline: false }),
    ])
  })

  it('tracks a service worker registration and checks for an update', async () => {
    const registration = { installing: null, update: vi.fn(async () => undefined) }
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
  it('waits for the installing worker to become installed after updating', async () => {
    const worker = new EventTarget()
    const installing = worker as unknown as ServiceWorker
    let state: ServiceWorkerState = 'installing'
    Object.defineProperty(worker, 'state', { get: () => state })
    const registration = {
      installing,
      waiting: null,
      update: vi.fn(async () => {
        await Promise.resolve()
      }),
    }
    const layer = makeServiceWorkerLayer((options) => {
      options?.onRegisteredSW?.('/sw.js', registration as unknown as ServiceWorkerRegistration)
      return async () => {}
    })
    let complete = false
    const running = service(Effect.gen(function*() {
      const serviceWorker = yield* ServiceWorker
      yield* serviceWorker.checkForUpdate
      complete = true
    }), layer)
    await Promise.resolve()
    expect(registration.update).toHaveBeenCalledTimes(1)
    expect(complete).toBe(false)
    state = 'installed'
    worker.dispatchEvent(new Event('statechange'))
    await running
    expect(complete).toBe(true)
  })
  it('fails update checking when the installing worker does not finish within ten seconds', async () => {
    vi.useFakeTimers()
    const worker = new EventTarget()
    const installing = worker as unknown as ServiceWorker
    Object.defineProperty(worker, 'state', { value: 'installing' })
    const registration = {
      installing,
      waiting: null,
      update: vi.fn(async () => undefined),
    }
    const layer = makeServiceWorkerLayer((options) => {
      options?.onRegisteredSW?.('/sw.js', registration as unknown as ServiceWorkerRegistration)
      return async () => {}
    })
    try {
      const running = service(Effect.gen(function*() {
        const serviceWorker = yield* ServiceWorker
        yield* serviceWorker.checkForUpdate
      }), layer)
      const failure = expect(running).rejects.toMatchObject({
        _tag: 'ServiceWorkerUpdateError',
        cause: expect.objectContaining({ message: 'Timed out waiting for service worker installation' }),
      })
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(10_000)
      await failure
    } finally {
      vi.useRealTimers()
    }
  })

  it('fails activation if the active controller does not change', async () => {
    vi.useFakeTimers()
    const container = new EventTarget() as ServiceWorkerContainer
    Object.defineProperty(container, 'controller', { value: {} })
    vi.stubGlobal('navigator', { onLine: true, serviceWorker: container })
    const layer = makeServiceWorkerLayer(() => async () => {})
    try {
      const running = service(Effect.gen(function*() {
        const serviceWorker = yield* ServiceWorker
        yield* serviceWorker.applyUpdate
      }), layer)
      const failure = expect(running).rejects.toMatchObject({
        _tag: 'ServiceWorkerUpdateError',
        cause: expect.objectContaining({ message: 'Timed out waiting for service worker controller change' }),
      })
      await vi.advanceTimersByTimeAsync(10_000)
      await failure
    } finally {
      vi.useRealTimers()
      vi.unstubAllGlobals()
    }
  })

  it('waits for an observed controller change before activation succeeds', async () => {
    const container = new EventTarget() as ServiceWorkerContainer
    let controller: ServiceWorker | null = {} as ServiceWorker
    Object.defineProperty(container, 'controller', { get: () => controller })
    vi.stubGlobal('navigator', { onLine: true, serviceWorker: container })
    const layer = makeServiceWorkerLayer(() => async () => {})
    try {
      let complete = false
      const running = service(Effect.gen(function*() {
        const serviceWorker = yield* ServiceWorker
        yield* serviceWorker.applyUpdate
        complete = true
      }), layer)
      await Promise.resolve()
      expect(complete).toBe(false)
      controller = {} as ServiceWorker
      container.dispatchEvent(new Event('controllerchange'))
      await running
      expect(complete).toBe(true)
    } finally {
      vi.unstubAllGlobals()
    }
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
