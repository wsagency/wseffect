import { Option, Schema } from 'effect'
import { describe, expect, it } from 'vitest'
import { alphaPage } from './fixtures/pages/alpha.js'
import { betaPage } from './fixtures/pages/beta.js'
import { makePages } from '../src/registry.js'
import type { ModelOf } from '../src/contract.js'
import type { PageSlot } from '../src/slots.js'
import { slotsSchema } from '../src/slotCodec.js'

const makeRegistry = () => makePages({
  alpha: async () => alphaPage,
  beta: async () => betaPage,
})

const idleSlots = () => ({ alpha: { _tag: 'Idle' as const }, beta: { _tag: 'Idle' as const } })

function encodeAlpha(slot: PageSlot<ModelOf<typeof alphaPage>>, register = true): Schema.Json {
  const pages = makeRegistry()
  if (register) pages.registry.register('alpha', alphaPage)
  const slots = { ...idleSlots(), alpha: slot }
  const encoded = Schema.encodeSync(Schema.toCodecJson(slotsSchema(pages)))(slots)
  if (encoded === null || typeof encoded !== 'object' || Array.isArray(encoded) || !('alpha' in encoded)) {
    throw new Error('Expected encoded page slots object')
  }
  return encoded.alpha
}

function decodeAlpha(encoded: Schema.Json, register = true): PageSlot<ModelOf<typeof alphaPage>> | undefined {
  const pages = makeRegistry()
  if (register) pages.registry.register('alpha', alphaPage)
  const codec = Schema.toCodecJson(slotsSchema(pages))
  const result = Schema.decodeUnknownOption(codec)({ alpha: encoded, beta: { _tag: 'Idle' } })
  return Option.isSome(result) ? result.value.alpha : undefined
}

describe('slotsSchema', () => {
  it('encodes every state with and without a registered page', () => {
    const states: Array<PageSlot<ModelOf<typeof alphaPage>>> = [
      { _tag: 'Idle' },
      { _tag: 'Available' },
      { _tag: 'Loading' },
      { _tag: 'Failed', cause: 'Offline', reason: 'offline' },
      { _tag: 'Ready', model: { maybeNote: Option.some('x') } },
      { _tag: 'Dehydrated', encoded: { maybeNote: { _tag: 'Some', value: 'x' } } },
    ]
    for (const isRegistered of [false, true]) {
      for (const state of states) expect(() => encodeAlpha(state, isRegistered)).not.toThrow()
    }
  })

  it('encodes Available as Idle and Dehydrated as Ready carrying its encoded model', () => {
    expect(encodeAlpha({ _tag: 'Available' })).toEqual({ _tag: 'Idle' })
    const encoded = { maybeNote: { _tag: 'Some', value: 'saved' } } as const
    expect(encodeAlpha({ _tag: 'Dehydrated', encoded })).toEqual({ _tag: 'Ready', model: encoded })
  })

  it('decodes a registered Ready page model including Option fields', () => {
    const model = Schema.encodeSync(Schema.toCodecJson(alphaPage.Model))({ maybeNote: Option.some('x') })
    const decoded = decodeAlpha({ _tag: 'Ready', model })
    expect(decoded?._tag).toBe('Ready')
    if (decoded?._tag === 'Ready') expect(Option.isSome(decoded.model.maybeNote)).toBe(true)
  })

  it('decodes Ready as Dehydrated when its page is not registered', () => {
    const model = { maybeNote: { _tag: 'Some', value: 'saved' } }
    expect(decodeAlpha({ _tag: 'Ready', model }, false)).toEqual({ _tag: 'Dehydrated', encoded: model })
  })

  it('keeps an undecodable registered Ready model Dehydrated', () => {
    const model = { maybeNote: 3 }
    expect(decodeAlpha({ _tag: 'Ready', model })).toEqual({ _tag: 'Dehydrated', encoded: model })
  })

  it('decodes arbitrary JSON values to Idle without throwing', () => {
    const corrupt: Schema.Json[] = [null, 42, [], { _tag: 'Bogus' }, { _tag: 'Failed' }]
    for (const value of corrupt) expect(decodeAlpha(value)).toEqual({ _tag: 'Idle' })
  })

  it('round-trips NewVersion failures', () => {
    const failed = { _tag: 'Failed', cause: 'NewVersion', reason: 'build changed' } as const
    expect(decodeAlpha(encodeAlpha(failed))).toEqual(failed)
  })
})
