import { Deferred, Effect, Fiber, Layer, Option, Stream } from 'effect'
import { describe, expect, it, vi } from 'vitest'
import { PageLoader, PageLoadError, ensure } from '../src/loader.js'
import { alphaPage } from './fixtures/pages/alpha.js'
import { makeKitFixture } from './fixtures/kit.js'
import { makePages } from '../src/registry.js'
import { ServiceWorker, ServiceWorkerUpdateError } from '../src/pwa/serviceWorker.js'

const runCommand = (effect: Effect.Effect<unknown, unknown, unknown>) =>
  Effect.runPromise(effect as Effect.Effect<unknown, unknown, never>)

describe('page loader', () => {
  it('shares concurrent ensure calls for one page key', async () => {
    const load = vi.fn(async () => alphaPage)
    const testPages = makePages({ alpha: load })
    const [first, second] = await Effect.runPromise(Effect.all([
      ensure(testPages, 'alpha'),
      ensure(testPages, 'alpha'),
    ], { concurrency: 2 }))
    expect(first).toBe(second)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('uses the PageLoader service instead of the bundle loader', async () => {
    const bundleLoad = vi.fn(async () => { throw new Error('bundle loader should not run') })
    const serviceLoad = vi.fn(async () => alphaPage)
    const testPages = makePages({ alpha: bundleLoad })
    const result = await Effect.runPromise(ensure(testPages, 'alpha').pipe(
      Effect.provide(Layer.succeed(PageLoader, {
        load: () => Effect.tryPromise({
          try: serviceLoad,
          catch: (cause) => new PageLoadError({ key: 'alpha', cause }),
        }),
      })),
    ))
    expect(result).toBe(alphaPage)
    expect(bundleLoad).not.toHaveBeenCalled()
    expect(serviceLoad).toHaveBeenCalledTimes(1)
  })

  it('exposes model-derived page load subscriptions', async () => {
    const { binding, initial } = makeKitFixture()
    const subscription = binding.subscriptions['wseffect:load:alpha']
    const model = initial()
    expect(subscription.modelToDependencies(model)).toEqual({ isNeeded: false })
    const loading = { ...model, activeKeys: ['alpha'] as const, slots: { ...model.slots, alpha: { _tag: 'Loading' as const } } }
    expect(subscription.modelToDependencies(loading)).toEqual({ isNeeded: true })
    expect(subscription.modelToDependencies({ ...model, slots: { ...model.slots, alpha: { _tag: 'Loading' as const } } })).toEqual({ isNeeded: false })
    const dehydrated = { ...loading, slots: { ...loading.slots, alpha: { _tag: 'Dehydrated' as const, encoded: {} } } }
    expect(subscription.modelToDependencies(dehydrated)).toEqual({ isNeeded: true })
    const messages = await Effect.runPromise(Stream.runCollect(subscription.dependenciesToStream({ isNeeded: false }, () => ({ isNeeded: false }))))
    expect(messages).toHaveLength(0)
  })
  it('clears a rejected in-flight load so a later ensure retries', async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new Error('chunk failed'))
      .mockResolvedValueOnce(alphaPage)
    const testPages = makePages({ alpha: load })
    await expect(Effect.runPromise(ensure(testPages, 'alpha'))).rejects.toMatchObject({
      _tag: 'PageLoadError',
      key: 'alpha',
    })
    expect(await Effect.runPromise(ensure(testPages, 'alpha'))).toBe(alphaPage)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('resumes an A→B→A page load after interrupting the first requesting fiber', async () => {
    const pages = makePages({ alpha: async () => alphaPage })
    const started = Deferred.makeUnsafe<void>()
    const release = Deferred.makeUnsafe<void>()
    const interrupted = Deferred.makeUnsafe<void>()
    const load = vi.fn()
    const layer = Layer.succeed(PageLoader, {
      load: () => Effect.onInterrupt(
        Effect.gen(function*() {
          load()
          yield* Deferred.succeed(started, undefined)
          yield* Deferred.await(release)
          return alphaPage
        }),
        () => Deferred.succeed(interrupted, undefined),
      ),
    })
    const result = await Effect.runPromise(Effect.gen(function*() {
      const first = yield* Effect.forkChild(ensure(pages, 'alpha'))
      yield* Deferred.await(started)
      yield* Fiber.interrupt(first)
      const resumed = yield* Effect.forkChild(ensure(pages, 'alpha'))
      yield* Effect.yieldNow
      yield* Deferred.succeed(release, undefined)
      return yield* Fiber.join(resumed)
    }).pipe(Effect.provide(layer)))
    expect(result).toBe(alphaPage)
    expect(load).toHaveBeenCalledTimes(1)
    expect(Deferred.isDoneUnsafe(interrupted)).toBe(false)
  })

  it('emits FailedPageModule with the classifier result after a loader failure', async () => {
    const { binding } = makeKitFixture()
    const subscription = binding.subscriptions['wseffect:load:alpha']
    const layer = Layer.succeed(PageLoader, {
      load: () => Effect.fail(new PageLoadError({ key: 'alpha', cause: new Error('chunk failed') })),
    })
    vi.stubGlobal('navigator', { onLine: false })
    const messages = await Effect.runPromise(Stream.runCollect(subscription.dependenciesToStream(
      { isNeeded: true },
      () => ({ isNeeded: true }),
    )).pipe(Effect.provide(layer)))
    vi.unstubAllGlobals()
    expect(Array.from(messages)).toContainEqual(expect.objectContaining({
      _tag: 'FailedPageModule',
      key: 'alpha',
      cause: 'Offline',
      reason: 'chunk failed',
    }))
  })
  it('classifies an online same-build 404 as LoadError through the binding', async () => {
    const { binding, KitMessage } = makeKitFixture()
    const subscription = binding.subscriptions['wseffect:load:alpha']
    const layer = Layer.succeed(PageLoader, {
      load: () => Effect.fail(new PageLoadError({ key: 'alpha', cause: new Error('404 Not Found') })),
    })
    vi.stubGlobal('navigator', { onLine: true })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ buildId: 'test-build' }), { status: 200 })))
    try {
      const messages = await Effect.runPromise(Stream.runCollect(subscription.dependenciesToStream(
        { isNeeded: true },
        () => ({ isNeeded: true }),
      )).pipe(Effect.provide(layer)))
      expect(Array.from(messages)).toContainEqual(expect.objectContaining({
        _tag: 'FailedPageModule',
        key: 'alpha',
        cause: 'LoadError',
        reason: '404 Not Found',
      }))
      const classified = await runCommand(binding.commands.ClassifyPageFailure({ key: 'alpha', reason: '404 Not Found' }).effect)
      expect(classified).toEqual(KitMessage.FailedPageModule({
        key: 'alpha',
        cause: 'LoadError',
        reason: '404 Not Found',
      }))
    } finally {
      vi.unstubAllGlobals()
    }
  })
  it('classifies a failed version request as Offline', async () => {
    const { binding, KitMessage } = makeKitFixture()
    vi.stubGlobal('navigator', { onLine: true })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network unavailable') }))
    try {
      const message = await runCommand(binding.commands.ClassifyPageFailure({ key: 'alpha', reason: 'chunk failed' }).effect)
      expect(message).toEqual(KitMessage.FailedPageModule({
        key: 'alpha',
        cause: 'Offline',
        reason: 'chunk failed',
      }))
    } finally {
      vi.unstubAllGlobals()
    }
  })
  it('executes the LoadPageForPrefetch command body', async () => {
    const { binding, KitMessage, pages } = makeKitFixture()
    const message = await runCommand(binding.commands.LoadPageForPrefetch({ key: 'alpha' }).effect)
    expect(message).toEqual(KitMessage.CompletedPrefetch({ key: 'alpha', isLoaded: true }))
    expect(Option.isSome(pages.registry.get('alpha'))).toBe(true)
  })
  it('returns false when a prefetched page fails to load', async () => {
    const { binding, KitMessage } = makeKitFixture()
    const layer = Layer.succeed(PageLoader, {
      load: () => Effect.fail(new PageLoadError({ key: 'alpha', cause: new Error('chunk failed') })),
    })
    const message = await runCommand(binding.commands.LoadPageForPrefetch({ key: 'alpha' }).effect.pipe(Effect.provide(layer)))
    expect(message).toEqual(KitMessage.CompletedPrefetch({ key: 'alpha', isLoaded: false }))
  })
  it('emits LoadedPageModule while a page slot needs loading', async () => {
    const { binding } = makeKitFixture()
    const subscription = binding.subscriptions['wseffect:load:alpha']
    const messages = await Effect.runPromise(Stream.runCollect(subscription.dependenciesToStream(
      { isNeeded: true },
      () => ({ isNeeded: true }),
    )))
    expect(Array.from(messages)).toContainEqual(expect.objectContaining({ _tag: 'LoadedPageModule', key: 'alpha' }))
  })

  it('checks and applies a service worker update through ReloadDocument', async () => {
    const { binding, KitMessage } = makeKitFixture()
    const calls: Array<string> = []
    const layer = Layer.succeed(ServiceWorker, {
      events: Stream.empty,
      hasRegistration: Effect.succeed(true),
      checkForUpdate: Effect.sync(() => { calls.push('check') }),
      applyUpdate: Effect.sync(() => { calls.push('apply') }),
    })
    const message = await runCommand(binding.commands.ReloadDocument({}).effect.pipe(Effect.provide(layer)))
    expect(message).toEqual(KitMessage.CompletedApplyUpdate({}))
    expect(calls).toEqual(['check', 'apply'])
  })

  it('falls back to location.reload when no service worker registration exists', async () => {
    const { binding, KitMessage } = makeKitFixture()
    const reload = vi.fn()
    vi.stubGlobal('location', { reload })
    try {
      const message = await runCommand(binding.commands.ReloadDocument({}).effect)
      expect(message).toEqual(KitMessage.CompletedApplyUpdate({}))
      expect(reload).toHaveBeenCalledTimes(1)
    } finally {
      vi.unstubAllGlobals()
    }
  })
  it('reports a failed document reload when location.reload throws', async () => {
    const { binding, KitMessage } = makeKitFixture()
    vi.stubGlobal('location', { reload: () => { throw new Error('reload failed') } })
    try {
      const message = await runCommand(binding.commands.ReloadDocument({}).effect)
      expect(message).toEqual(KitMessage.FailedApplyUpdate({ reason: 'Error: reload failed' }))
    } finally {
      vi.unstubAllGlobals()
    }
  })
  it('reloads when the service worker has no registration', async () => {
    const { binding, KitMessage } = makeKitFixture()
    const reload = vi.fn()
    vi.stubGlobal('location', { reload })
    const layer = Layer.succeed(ServiceWorker, {
      events: Stream.empty,
      hasRegistration: Effect.succeed(false),
      checkForUpdate: Effect.void,
      applyUpdate: Effect.void,
    })
    try {
      const message = await runCommand(binding.commands.ReloadDocument({}).effect.pipe(Effect.provide(layer)))
      expect(message).toEqual(KitMessage.CompletedApplyUpdate({}))
      expect(reload).toHaveBeenCalledTimes(1)
    } finally {
      vi.unstubAllGlobals()
    }
  })
  it('reports failed reload when an unregistered service worker falls back to a throwing reload', async () => {
    const { binding, KitMessage } = makeKitFixture()
    vi.stubGlobal('location', { reload: () => { throw new Error('reload failed') } })
    const layer = Layer.succeed(ServiceWorker, {
      events: Stream.empty,
      hasRegistration: Effect.succeed(false),
      checkForUpdate: Effect.void,
      applyUpdate: Effect.void,
    })
    try {
      const message = await runCommand(binding.commands.ReloadDocument({}).effect.pipe(Effect.provide(layer)))
      expect(message).toEqual(KitMessage.FailedApplyUpdate({ reason: 'Error: reload failed' }))
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('maps service worker update errors to FailedApplyUpdate', async () => {
    const { binding, KitMessage } = makeKitFixture()
    const layer = Layer.succeed(ServiceWorker, {
      events: Stream.empty,
      hasRegistration: Effect.succeed(true),
      checkForUpdate: Effect.void,
      applyUpdate: Effect.fail(new ServiceWorkerUpdateError({ cause: new Error('activation failed') })),
    })
    const message = await runCommand(binding.commands.ReloadDocument({}).effect.pipe(Effect.provide(layer)))
    expect(message).toEqual(KitMessage.FailedApplyUpdate({ reason: 'Error: activation failed' }))
  })
})
