import { Option, Schema } from 'effect'
import { describe, expect, it } from 'vitest'
import { alphaPage, Message as AlphaMessage } from './fixtures/pages/alpha.js'
import { betaPage } from './fixtures/pages/beta.js'
import { makePages, messageSchema } from '../src/registry.js'

const loaders = {
  alpha: async () => alphaPage,
  beta: async () => betaPage,
}

describe('makePages', () => {
  it('returns keys in loader order', () => {
    expect(makePages(loaders).keys).toEqual(['alpha', 'beta'])
  })

  it('returns only the keys, loaders and registry data', () => {
    expect(Object.keys(makePages(loaders))).toEqual(['keys', 'loaders', 'registry'])
  })

  it('validates messages only after registering the page', () => {
    const pages = makePages(loaders)
    const schema = messageSchema(pages, 'alpha')
    const validMessage = { _tag: 'AlphaPing' }
    expect(Schema.is(schema)(validMessage)).toBe(false)
    pages.registry.register('alpha', alphaPage)
    expect(Schema.is(schema)(validMessage)).toBe(true)
  })

  it('round-trips registered page messages through JSON and rejects unregistered decoding', () => {
    const pages = makePages(loaders)
    const codec = Schema.toCodecJson(messageSchema(pages, 'alpha'))
    const message = AlphaMessage.AlphaPing()
    expect(Option.isNone(Schema.decodeUnknownOption(codec)(message))).toBe(true)
    pages.registry.register('alpha', alphaPage)
    const encoded = Schema.encodeSync(codec)(message)
    expect(Schema.decodeUnknownOption(codec)(encoded)).toEqual(Option.some(message))
  })
  it('rejects a different page message for the requested key', () => {
    const pages = makePages(loaders)
    pages.registry.register('alpha', alphaPage)
    pages.registry.register('beta', betaPage)
    expect(Schema.is(messageSchema(pages, 'alpha'))({ _tag: 'BetaPing' })).toBe(false)
  })
})
