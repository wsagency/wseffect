import { Context, Data, Deferred, Effect, Option, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'
import type { AnyPage } from './contract.js'
import type { PagesHandle } from './registry.js'
export interface LoaderSubscriptionsConfig<Pages extends Record<string, AnyPage>, Model, Message> {
  readonly pages: PagesHandle<Pages>
  readonly isNeeded: (model: Model, key: keyof Pages & string) => boolean
  readonly onLoaded: (key: keyof Pages & string) => Message
  readonly onFailure: (key: keyof Pages & string, error: PageLoadError) => Effect.Effect<Message>
}

export function loaderSubscriptions<Pages extends Record<string, AnyPage>, Model, Message>(
  config: LoaderSubscriptionsConfig<Pages, Model, Message>,
): Readonly<Record<string, Subscription.Subscription<Model, Message, { readonly isNeeded: boolean }>>> {
  return Subscription.make<Model, Message>()((entry) =>
    Object.fromEntries(config.pages.keys.map((key) => [
      `wseffect:load:${key}`,
      entry(
        { isNeeded: Schema.Boolean },
        {
          modelToDependencies: (model) => ({ isNeeded: config.isNeeded(model, key) }),
          dependenciesToStream: ({ isNeeded }) => isNeeded
            ? Stream.fromEffect(Effect.matchEffect(ensure(config.pages, key, { retryJoinedFailure: true }), {
              onSuccess: () => Effect.succeed(config.onLoaded(key)),
              onFailure: (error) => config.onFailure(key, error),
            }))
            : Stream.empty,
        },
      ),
    ])),
  )
}

export class PageLoadError extends Data.TaggedError('PageLoadError')<{
  readonly key: string
  readonly cause: unknown
}> {}

export class PageLoader extends Context.Service<PageLoader, {
  readonly load: (key: string) => Effect.Effect<AnyPage, PageLoadError>
}>()('wseffect/PageLoader') {}

interface EnsureOptions {
  readonly retryJoinedFailure?: boolean
}
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
  options: EnsureOptions = {},
): Effect.Effect<Pages[Key], PageLoadError> {
  return Effect.suspend(() => {
    const loaded = pages.registry.get(key)
    if (Option.isSome(loaded)) return Effect.succeed(loaded.value)

    const loads = pendingLoads(pages)
    const active = loads.get(key)
    if (active !== undefined) {
      const waiting = Deferred.await(active) as Effect.Effect<Pages[Key], PageLoadError>
      return options.retryJoinedFailure === true
        ? Effect.catch(waiting, () => ensure(pages, key))
        : waiting
    }

    const deferred = Deferred.makeUnsafe<AnyPage, PageLoadError>()
    loads.set(key, deferred)
    const load = Effect.gen(function*() {
      const service = yield* Effect.serviceOption(PageLoader)
      const page = yield* Option.match(service, {
        onNone: () => loadFromBundle(pages, key),
        onSome: (loader) => loader.load(key),
      })
      pages.registry.register(key, page as Pages[Key])
      return page
    })
    const sharedLoad = Effect.ensuring(
      Effect.as(Effect.flatMap(Effect.exit(load), (exit) => Effect.flatMap(
        Effect.sync(() => {
          if (loads.get(key) === deferred) loads.delete(key)
        }),
        () => Deferred.done(deferred, exit),
      )), undefined),
      Effect.sync(() => {
        if (loads.get(key) === deferred) loads.delete(key)
      }),
    )
    return Effect.andThen(
      Effect.forkDetach(sharedLoad),
      Deferred.await(deferred) as Effect.Effect<Pages[Key], PageLoadError>,
    )
  })
}
