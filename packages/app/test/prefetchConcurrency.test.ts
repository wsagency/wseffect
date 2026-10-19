import { Effect, Fiber } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { describe, expect, it } from 'vitest'
import { bindKit } from '../src/kit/binding.js'
import { kitMessageFields } from '../src/kit/messages.js'
import { makePages, messageSchema } from '../src/registry.js'
import { alphaPage } from './fixtures/pages/alpha.js'

const runCommandFork = (effect: Effect.Effect<unknown, unknown, unknown>) =>
  Effect.runFork(effect as Effect.Effect<unknown, unknown, never>)
describe('prefetch concurrency', () => {
  it('limits speculative page loads to two in flight', async () => {
    let active = 0
    let maximumActive = 0
    let started = 0
    const twoStarted = Promise.withResolvers<void>()
    const releaseLoads = Promise.withResolvers<void>()
    const load = async () => {
      active += 1
      started += 1
      maximumActive = Math.max(maximumActive, active)
      if (started === 2) twoStarted.resolve()
      try {
        await releaseLoads.promise
        return alphaPage
      } finally {
        active -= 1
      }
    }
    const pages = makePages({ alpha: load, beta: load, gamma: load })
    const KitMessage = defineMessageUnion({
      ...kitMessageFields(pages),
      GotAlphaPageMessage: { message: messageSchema(pages, 'alpha') },
      GotBetaPageMessage: { message: messageSchema(pages, 'beta') },
      GotGammaPageMessage: { message: messageSchema(pages, 'gamma') },
    })
    const binding = bindKit({
      pages,
      KitMessage,
      pageMessageTags: {
        alpha: 'GotAlphaPageMessage',
        beta: 'GotBetaPageMessage',
        gamma: 'GotGammaPageMessage',
      },
    })
    const fibers = pages.keys.map((key) =>
      runCommandFork(binding.commands.LoadPageForPrefetch({ key }).effect),
    )

    await twoStarted.promise
    await new Promise<void>((resolveAfterTurn) => setImmediate(resolveAfterTurn))
    expect(started).toBe(2)
    expect(maximumActive).toBe(2)
    releaseLoads.resolve()
    await Promise.all(fibers.map((fiber) => Effect.runPromise(Fiber.join(fiber))))
    expect(maximumActive).toBe(2)
    expect(started).toBe(3)
  })
})
