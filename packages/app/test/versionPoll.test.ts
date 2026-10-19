import { Effect, Option, Stream } from 'effect'
import { describe, expect, it, vi } from 'vitest'
import { versionPollSubscription } from '../src/versionPoll.js'

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
})
