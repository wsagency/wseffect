import { Deferred, Effect, Layer, Stream } from 'effect'
import { describe, expect, it, vi } from 'vitest'
import { PageLoader, PageLoadError, ensure } from '../src/loader.js'
import { alphaPage } from './fixtures/pages/alpha.js'
import { binding, initial } from './fixtures/kit.js'
import { makePages } from '../src/registry.js'

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

  it('interrupts the loader and emits nothing when isNeeded becomes false', async () => {
    const subscription = binding.subscriptions['wseffect:load:alpha']
    const started = Deferred.makeUnsafe<void>()
    const interrupted = Deferred.makeUnsafe<void>()
    const layer = Layer.succeed(PageLoader, {
      load: () => Effect.onInterrupt(
        Effect.andThen(Deferred.succeed(started, undefined), Effect.never),
        () => Deferred.succeed(interrupted, undefined),
      ),
    })
    const dependencies = Stream.concat(
      Stream.make({ isNeeded: true }),
      Stream.fromEffect(Deferred.await(started)).pipe(Stream.as({ isNeeded: false })),
    )
    const messages = await Effect.runPromise(Stream.runCollect(dependencies.pipe(
      Stream.switchMap((deps) => subscription.dependenciesToStream(deps, () => deps)),
    )).pipe(Effect.provide(layer)))
    expect(Array.from(messages)).toEqual([])
    expect(Deferred.isDoneUnsafe(interrupted)).toBe(true)
  })

  it('emits FailedPageModule with the classifier result after a loader failure', async () => {
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
  it('emits LoadedPageModule while a page slot needs loading', async () => {
    const subscription = binding.subscriptions['wseffect:load:alpha']
    const messages = await Effect.runPromise(Stream.runCollect(subscription.dependenciesToStream(
      { isNeeded: true },
      () => ({ isNeeded: true }),
    )))
    expect(Array.from(messages)).toContainEqual(expect.objectContaining({ _tag: 'LoadedPageModule', key: 'alpha' }))
  })

})
