import { Effect, Fiber } from 'effect'
import { expect, it, vi } from 'vitest'
import type { KitBinding } from '../src/kit/binding.js'
import { makeApp } from '../src/app.js'
import { kitStateSchema } from '../src/kit/state.js'
import { makeKitFixture } from './fixtures/kit.js'

it('starts the application runtime and renders its initial model', async () => {
  const { binding, KitMessage, alphaInitial } = makeKitFixture()
  type Binding = typeof binding
  type Pages = Binding extends KitBinding<infer P, any> ? P : never
  type Model = ReturnType<typeof alphaInitial>
  const view = vi.fn((_model, h) => ({ title: 'test', body: h.div([], []) }))
  const container = document.createElement('div')
  container.id = 'app'
  const app = makeApp<Model, any, Pages, any>({
    Model: kitStateSchema(binding.pages),
    update: binding.update as never,
    view,
    container,
    routing: {
      onUrlRequest: () => KitMessage.EnteredRoute({ keys: [] }),
      onUrlChange: () => KitMessage.EnteredRoute({ keys: [] }),
    },
    init: () => ({ model: alphaInitial() }),
    kit: {
      binding,
      read: (model) => model,
      toParentMessage: (message) => message,
    },
    versionPollMs: 3_600_000,
  })

  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ buildId: 'test-build' }), {
    headers: { 'content-type': 'application/json' },
  })))
  const fiber = Effect.runFork(app.start())
  try {
    await vi.waitFor(() => expect(view).toHaveBeenCalledOnce(), { timeout: 2_000 })
  } finally {
    await Effect.runPromise(Fiber.interrupt(fiber))
    vi.unstubAllGlobals()
  }
})
