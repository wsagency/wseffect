import { Effect } from 'effect'
import { describe, expect, it, vi } from 'vitest'
import { makeKitFixture } from './fixtures/kit.js'
import { kitStateSchema } from '../src/kit/state.js'
import type { KitBinding } from '../src/kit/binding.js'
import { makeApp } from '../src/app.js'

const { makeApplication } = vi.hoisted(() => ({ makeApplication: vi.fn() }))
vi.mock('@wsagency/wseffect-foldkit/runtime', () => ({ makeApplication }))

describe('makeApp', () => {
  it('merges app, page-loader, version-poll and enabled service-worker subscriptions', () => {
    const runtime = { runtimeId: 'test', start: () => Effect.void, ports: undefined }
    makeApplication.mockReturnValue(runtime)
    const { binding, KitMessage, alphaInitial } = makeKitFixture()
    type Binding = typeof binding
    type Pages = Binding extends KitBinding<infer P, any> ? P : never
    type Message = any
    type Model = ReturnType<typeof alphaInitial>
    const crash = { view: vi.fn() }
    const app = makeApp<Model, Message, Pages, Message>({
      Model: kitStateSchema(binding.pages),
      update: binding.update as never,
      view: (_model, h) => ({ title: 'test', body: h.div([], []) }),
      container: null,
      routing: {
        onUrlRequest: () => KitMessage.EnteredRoute({ keys: [] }),
        onUrlChange: () => KitMessage.EnteredRoute({ keys: [] }),
      },
      init: () => ({ model: alphaInitial() }),
      crash,
      kit: {
        binding,
        read: (model) => model,
        toParentMessage: (message) => message,
      },
    })

    expect(app).toBe(runtime)
    const config = makeApplication.mock.calls[0]?.[0]
    expect(config).toBeDefined()
    expect(config.crash).toBe(crash)
    expect(Object.keys(config.subscriptions)).toEqual(expect.arrayContaining([
      'wseffect:load:alpha',
      'wseffect:version-poll',
      'wseffect:service-worker',
    ]))
    expect(Object.keys(config.subscriptions)).toHaveLength(4)
  })
})
