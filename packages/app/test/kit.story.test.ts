import { Option } from 'effect'
import { Command, expectNoOutMessage, expectOutMessage, given, message, model, story } from 'foldkit/story'
import { describe, expect, it } from 'vitest'
import { alphaPage, AlphaInit, Message as AlphaMessage } from './fixtures/pages/alpha.js'
import { binding, KitMessage, alphaInitial, alphaMessage, alphaOutMessage, pages } from './fixtures/kit.js'

describe('kit update', () => {
  it('marks route-required idle pages Loading and updates active keys', () => {
    const state = alphaInitial()
    story(binding.update, given(state), message(KitMessage.EnteredRoute({ keys: ['alpha'] })),
      model((next) => {
        expect(next.activeKeys).toEqual(['alpha'])
        expect(next.slots.alpha._tag).toBe('Loading')
      }), expectNoOutMessage())
  })

  it('activates a loaded page and lifts its init Command', () => {
    pages.registry.register('alpha', alphaPage)
    const state = { ...alphaInitial(), slots: { ...alphaInitial().slots, alpha: { _tag: 'Loading' as const } } }
    story(binding.update, given(state), message(KitMessage.LoadedPageModule({ key: 'alpha' })),
      Command.resolve(AlphaInit(), AlphaMessage.AlphaPing()),
      model((next) => expect(next.slots.alpha._tag).toBe('Ready')))
  })

  it('prefetches without initializing and commits a successful prefetch as Available', () => {
    story(binding.update, given(alphaInitial()), message(KitMessage.RequestedPrefetch({ key: 'alpha' })),
      Command.expectExact(binding.commands.LoadPageForPrefetch({ key: 'alpha' })),
      Command.resolve(binding.commands.LoadPageForPrefetch, KitMessage.CompletedPrefetch({ key: 'alpha', isLoaded: true })),
      model((next) => expect(next.slots.alpha._tag).toBe('Available')))
  })

  it('leaves a failed prefetch Idle', () => {
    story(binding.update, given(alphaInitial()), message(KitMessage.RequestedPrefetch({ key: 'alpha' })),
      Command.resolve(binding.commands.LoadPageForPrefetch, KitMessage.CompletedPrefetch({ key: 'alpha', isLoaded: false })),
      model((next) => expect(next.slots.alpha._tag).toBe('Idle')))
  })

  it('activates an Available page in the route update without a loading step', () => {
    pages.registry.register('alpha', alphaPage)
    const state = { ...alphaInitial(), slots: { ...alphaInitial().slots, alpha: { _tag: 'Available' as const } } }
    story(binding.update, given(state), message(KitMessage.EnteredRoute({ keys: ['alpha'] })),
      Command.resolve(AlphaInit(), AlphaMessage.AlphaPing()),
      model((next) => expect(next.slots.alpha._tag).toBe('Ready')))
  })

  it('restores a decodable Dehydrated model without running init', () => {
    pages.registry.register('alpha', alphaPage)
    const state = { ...alphaInitial(), slots: { ...alphaInitial().slots, alpha: {
      _tag: 'Dehydrated' as const,
      encoded: { maybeNote: { _tag: 'Some', value: 'saved' } },
    } } }
    story(binding.update, given(state), message(KitMessage.LoadedPageModule({ key: 'alpha' })),
      Command.expectNone(),
      model((next) => {
        expect(next.slots.alpha._tag).toBe('Ready')
        if (next.slots.alpha._tag === 'Ready') expect(Option.isSome(next.slots.alpha.model.maybeNote)).toBe(true)
      }))
  })

  it('initializes a Dehydrated page when its stored model no longer decodes', () => {
    pages.registry.register('alpha', alphaPage)
    const state = { ...alphaInitial(), slots: { ...alphaInitial().slots, alpha: {
      _tag: 'Dehydrated' as const,
      encoded: { maybeNote: 7 },
    } } }
    story(binding.update, given(state), message(KitMessage.LoadedPageModule({ key: 'alpha' })),
      Command.resolve(AlphaInit(), AlphaMessage.AlphaPing()),
      model((next) => expect(next.slots.alpha._tag).toBe('Ready')))
  })

  it('tracks failures, retries route entry, and reloads NewVersion failures', () => {
    const state = alphaInitial()
    story(binding.update, given(state), message(KitMessage.FailedPageModule({ key: 'alpha', cause: 'LoadError', reason: 'chunk failed' })),
      model((next) => expect(next.slots.alpha).toEqual({ _tag: 'Failed', cause: 'LoadError', reason: 'chunk failed' })),
      message(KitMessage.ClickedRetryPage({ key: 'alpha' })),
      model((next) => expect(next.slots.alpha._tag).toBe('Loading')))
    const offline = { ...state, slots: { ...state.slots, alpha: { _tag: 'Failed' as const, cause: 'Offline' as const, reason: 'offline' } } }
    story(binding.update, given(offline), message(KitMessage.EnteredRoute({ keys: ['alpha'] })),
      model((next) => expect(next.slots.alpha._tag).toBe('Loading')))
    const updated = { ...state, slots: { ...state.slots, alpha: { _tag: 'Failed' as const, cause: 'NewVersion' as const, reason: 'new build' } } }
    story(binding.update, given(updated), message(KitMessage.ClickedReloadPage({ key: 'alpha' })),
      Command.resolve(binding.commands.ReloadDocument({}), KitMessage.CompletedApplyUpdate({})))
  })

  it('keeps Ready and Loading slots when the active route is left', () => {
    const state = { ...alphaInitial(), slots: {
      ...alphaInitial().slots,
      alpha: { _tag: 'Ready' as const, model: { maybeNote: Option.none() } },
      beta: { _tag: 'Loading' as const },
    } }
    story(binding.update, given(state), message(KitMessage.EnteredRoute({ keys: [] })),
      model((next) => {
        expect(next.activeKeys).toEqual([])
        expect(next.slots.alpha._tag).toBe('Ready')
        expect(next.slots.beta._tag).toBe('Loading')
      }))
  })

  it('returns page OutMessages to the shell', () => {
    pages.registry.register('alpha', alphaPage)
    const state = { ...alphaInitial(), slots: { ...alphaInitial().slots, alpha: {
      _tag: 'Ready' as const,
      model: { maybeNote: Option.none() },
    } } }
    story(binding.update, given(state), message(KitMessage.GotAlphaPageMessage({ message: alphaMessage })),
      expectOutMessage(alphaOutMessage))
  })
})
