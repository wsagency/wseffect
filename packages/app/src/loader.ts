import { Context, Data, Deferred, Effect, Option } from 'effect'
import type { AnyPage } from './contract.js'
import type { PagesHandle } from './registry.js'

export class PageLoadError extends Data.TaggedError('PageLoadError')<{
  readonly key: string
  readonly cause: unknown
}> {}

export class PageLoader extends Context.Service<PageLoader, {
  readonly load: (key: string) => Effect.Effect<AnyPage, PageLoadError>
}>()('wseffect/PageLoader') {}

const inFlight = new WeakMap<object, Map<string, Deferred.Deferred<AnyPage, PageLoadError>>>()

function pendingLoads(pages: object): Map<string, Deferred.Deferred<AnyPage, PageLoadError>> {
  let loads = inFlight.get(pages)
  if (loads === undefined) {
    loads = new Map()
    inFlight.set(pages, loads)
  }
  return loads
}

function loadFromBundle<Pages extends Record<string, AnyPage>, Key extends keyof Pages & string>(
  pages: PagesHandle<Pages>,
  key: Key,
): Effect.Effect<Pages[Key], PageLoadError> {
  return Effect.tryPromise({
    try: () => pages.loaders[key](),
    catch: (cause) => new PageLoadError({ key, cause }),
  })
}

/** Loads and registers a page once. Concurrent requests share the same result; failures are evicted for retry. */
export function ensure<Pages extends Record<string, AnyPage>, Key extends keyof Pages & string>(
  pages: PagesHandle<Pages>,
  key: Key,
): Effect.Effect<Pages[Key], PageLoadError> {
  return Effect.suspend(() => {
    const loaded = pages.registry.get(key)
    if (Option.isSome(loaded)) return Effect.succeed(loaded.value)

    const loads = pendingLoads(pages)
    const active = loads.get(key)
    if (active !== undefined) return Deferred.await(active) as Effect.Effect<Pages[Key], PageLoadError>

    const deferred = Deferred.makeUnsafe<AnyPage, PageLoadError>()
    loads.set(key, deferred)
    const load = Effect.gen(function*() {
      const service = yield* Effect.serviceOption(PageLoader)
      const page = yield* Option.match(service, {
        onNone: () => loadFromBundle(pages, key),
        onSome: (loader) => loader.load(key),
      })
      pages.registry.register(key, page as Pages[Key])
      yield* Deferred.succeed(deferred, page)
      return page as Pages[Key]
    })
    const loadWithCleanup = Effect.onInterrupt(load, () => Effect.andThen(
      Deferred.interrupt(deferred),
      Effect.sync(() => {
        if (loads.get(key) === deferred) loads.delete(key)
      }),
    ))
    return Effect.matchEffect(loadWithCleanup, {
      onSuccess: Effect.succeed,
      onFailure: (error) => Effect.andThen(
        Deferred.fail(deferred, error),
        Effect.andThen(
          Effect.sync(() => {
            if (loads.get(key) === deferred) loads.delete(key)
          }),
          Effect.fail(error),
        ),
      ),
    })
  })
}
