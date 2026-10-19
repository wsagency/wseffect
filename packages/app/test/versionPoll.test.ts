import { Effect, Fiber, Option, Stream } from 'effect'
import { TestClock } from 'effect/testing'
import { describe, expect, it, vi } from 'vitest'
import { ServiceWorker } from '../src/pwa/serviceWorker.js'
import { versionPollSubscription } from '../src/versionPoll.js'

const makeSubscription = (intervalMs = 300_000) => versionPollSubscription({
  intervalMs,
  runningBuildId: 'current-build',
  newVersionAvailable: (buildId) => ({ _tag: 'NewVersionAvailable', buildId }),
})['wseffect:version-poll']

const withVisibility = (visibilityState: DocumentVisibilityState, onLine: boolean, run: () => Promise<void>) => {
  const visibility = Object.getOwnPropertyDescriptor(document, 'visibilityState')
  const online = Object.getOwnPropertyDescriptor(navigator, 'onLine')
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: visibilityState })
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: onLine })
  return run().finally(() => {
    if (visibility) Object.defineProperty(document, 'visibilityState', visibility)
    else Reflect.deleteProperty(document, 'visibilityState')
    if (online) Object.defineProperty(navigator, 'onLine', online)
    else Reflect.deleteProperty(navigator, 'onLine')
  })
}

const noServiceWorker = {
  events: Stream.empty,
  hasRegistration: Effect.succeed(false),
  checkForUpdate: Effect.void,
  applyUpdate: Effect.void,
}

describe('version poll', () => {
  it('fetches the current version immediately and emits a new build ID', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ buildId: 'new-build' }), { status: 200 }))
    vi.stubGlobal('fetch', fetch)
    try {
      const subscription = versionPollSubscription({
        intervalMs: 60_000,
        runningBuildId: 'current-build',
        newVersionAvailable: (buildId) => ({ _tag: 'NewVersionAvailable', buildId }),
      })['wseffect:version-poll']
      const message = await Effect.runPromise(Stream.runHead(subscription.dependenciesToStream({})))
      expect(message).toEqual(Option.some({ _tag: 'NewVersionAvailable', buildId: 'new-build' }))
      expect(fetch).toHaveBeenCalledWith('/version.json', { cache: 'no-store' })
    } finally {
      vi.unstubAllGlobals()
    }
  })
  it('checks for a service worker update when a new build is found', async () => {
    const checkForUpdate = vi.fn()
    const fetch = vi.fn(async () => new Response(JSON.stringify({ buildId: 'new-build' }), { status: 200 }))
    vi.stubGlobal('fetch', fetch)
    try {
      const poll = versionPollSubscription({
        intervalMs: 60_000,
        runningBuildId: 'current-build',
        newVersionAvailable: (buildId) => ({ _tag: 'NewVersionAvailable', buildId }),
      })['wseffect:version-poll']
      const message = await Effect.runPromise(Stream.runHead(poll.dependenciesToStream({}).pipe(
        Stream.provideService(ServiceWorker, {
          events: Stream.empty,
          hasRegistration: Effect.succeed(true),
          checkForUpdate: Effect.sync(checkForUpdate),
          applyUpdate: Effect.void,
        }),
      )))
      expect(message).toEqual(Option.some({ _tag: 'NewVersionAvailable', buildId: 'new-build' }))
      expect(checkForUpdate).toHaveBeenCalledTimes(1)
    } finally {
      vi.unstubAllGlobals()
    }
  })
  it('polls immediately at zero and again after five minutes', async () =>
    withVisibility('visible', true, async () => {
      let startFirstFetch!: () => void
      const firstFetchStarted = new Promise<void>((resolve) => { startFirstFetch = resolve })
      const fetch = vi.fn()
        .mockImplementationOnce(async () => {
          startFirstFetch()
          return new Response(JSON.stringify({ buildId: 'current-build' }), { status: 200 })
        })
        .mockResolvedValueOnce(new Response(JSON.stringify({ buildId: 'new-build' }), { status: 200 }))
      vi.stubGlobal('fetch', fetch)
      try {
        const stream = makeSubscription().dependenciesToStream({}).pipe(
          Stream.provideService(ServiceWorker, noServiceWorker),
        )
        const program = Effect.gen(function*() {
          const fiber = yield* Effect.forkChild(Stream.runHead(stream))
          yield* Effect.promise(() => firstFetchStarted)
          expect(fetch).toHaveBeenCalledTimes(1)
          yield* Effect.yieldNow
          yield* TestClock.adjust(300_000)
          return yield* Fiber.join(fiber)
        })
        const message = await Effect.runPromise(program.pipe(Effect.provide(TestClock.layer())))
        expect(message).toEqual(Option.some({ _tag: 'NewVersionAvailable', buildId: 'new-build' }))
        expect(fetch).toHaveBeenCalledTimes(2)
      } finally {
        vi.unstubAllGlobals()
      }
    }))

  it('does not fetch while hidden, then fetches immediately when visible', async () =>
    withVisibility('hidden', true, async () => {
      const fetch = vi.fn(async () => new Response(JSON.stringify({ buildId: 'new-build' }), { status: 200 }))
      vi.stubGlobal('fetch', fetch)
      try {
        const stream = makeSubscription().dependenciesToStream({}).pipe(
          Stream.provideService(ServiceWorker, noServiceWorker),
        )
        const program = Effect.gen(function*() {
          const fiber = yield* Effect.forkChild(Stream.runHead(stream))
          yield* TestClock.adjust(0)
          expect(fetch).not.toHaveBeenCalled()
          Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
          document.dispatchEvent(new Event('visibilitychange'))
          return yield* Fiber.join(fiber)
        })
        const message = await Effect.runPromise(program.pipe(Effect.provide(TestClock.layer())))
        expect(message).toEqual(Option.some({ _tag: 'NewVersionAvailable', buildId: 'new-build' }))
        expect(fetch).toHaveBeenCalledTimes(1)
      } finally {
        vi.unstubAllGlobals()
      }
    }))

  it('fetches immediately when the browser comes online', async () =>
    withVisibility('visible', false, async () => {
      const fetch = vi.fn(async () => new Response(JSON.stringify({ buildId: 'new-build' }), { status: 200 }))
      vi.stubGlobal('fetch', fetch)
      try {
        const stream = makeSubscription().dependenciesToStream({}).pipe(
          Stream.provideService(ServiceWorker, noServiceWorker),
        )
        const program = Effect.gen(function*() {
          const fiber = yield* Effect.forkChild(Stream.runHead(stream))
          yield* TestClock.adjust(0)
          expect(fetch).not.toHaveBeenCalled()
          Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
          window.dispatchEvent(new Event('online'))
          return yield* Fiber.join(fiber)
        })
        const message = await Effect.runPromise(program.pipe(Effect.provide(TestClock.layer())))
        expect(message).toEqual(Option.some({ _tag: 'NewVersionAvailable', buildId: 'new-build' }))
        expect(fetch).toHaveBeenCalledTimes(1)
      } finally {
        vi.unstubAllGlobals()
      }
    }))

  it.each([
    ['network error', async () => { throw new Error('offline') }],
    ['HTML body', async () => new Response('<html>not JSON</html>', { status: 200 })],
  ])('emits nothing for a %s response', async (_label, response) =>
    withVisibility('visible', true, async () => {
      let startFetch!: () => void
      const fetchStarted = new Promise<void>((resolve) => { startFetch = resolve })
      const newVersionAvailable = vi.fn((buildId: string) => ({ _tag: 'NewVersionAvailable', buildId }))
      const poll = versionPollSubscription({
        intervalMs: 300_000,
        runningBuildId: 'current-build',
        newVersionAvailable,
      })['wseffect:version-poll']
      const fetch = vi.fn(async () => {
        startFetch()
        return response()
      })
      vi.stubGlobal('fetch', fetch)
      try {
        const stream = poll.dependenciesToStream({}).pipe(
          Stream.provideService(ServiceWorker, noServiceWorker),
        )
        const program = Effect.gen(function*() {
          const fiber = yield* Effect.forkChild(Stream.runHead(stream))
          yield* Effect.promise(() => fetchStarted)
          yield* Effect.yieldNow
          expect(fetch).toHaveBeenCalledTimes(1)
          expect(newVersionAvailable).not.toHaveBeenCalled()
          yield* Fiber.interrupt(fiber)
        })
        await Effect.runPromise(program.pipe(Effect.provide(TestClock.layer())))
      } finally {
        vi.unstubAllGlobals()
      }
    }))
})
