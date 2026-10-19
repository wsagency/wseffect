import { Option } from 'effect'
import { Command, expectNoOutMessage, expectOutMessage, given, message, model, story } from 'foldkit/story'
import { describe, expect, it } from 'vitest'
import { alphaPage, AlphaInit, AlphaUpdateCommand, Message as AlphaMessage } from './fixtures/pages/alpha.js'
import { alphaMessage, alphaOutMessage, makeKitFixture } from './fixtures/kit.js'
import { PwaEvent } from '../src/kit/messages.js'
import { activate } from '../src/kit/update.js'
describe('kit update', () => {
  it('creates an isolated page registry for each kit fixture', () => {
    const first = makeKitFixture()
    const second = makeKitFixture()
    first.pages.registry.register('alpha', alphaPage)
    expect(Option.isNone(second.pages.registry.get('alpha'))).toBe(true)
  })
  it('ignores activation notifications for unregistered pages', () => {
    const { binding, alphaInitial } = makeKitFixture()
    const state = alphaInitial()
    const result = activate(binding.pages, state.slots, 'alpha', binding.toParentMessage.alpha)
    expect(result.slots).toBe(state.slots)
    expect(result.commands).toEqual([])
  })

  it('constructs version and PWA kit messages through the binding', () => {
    const { binding, KitMessage } = makeKitFixture()
    expect(binding.messages.newVersionAvailable('next-build')).toEqual(KitMessage.NewVersionAvailable({ buildId: 'next-build' }))
    const event = PwaEvent.OfflineReady()
    expect(binding.messages.gotPwaEvent(event)).toEqual(KitMessage.GotPwaEvent({ event }))
  })
  it('marks route-required idle pages Loading and updates active keys', () => {
    const { binding, KitMessage, alphaInitial } = makeKitFixture()
    const state = alphaInitial()
    story(binding.update, given(state), message(KitMessage.EnteredRoute({ keys: ['alpha'] })),
      model((next) => {
        expect(next.activeKeys).toEqual(['alpha'])
        expect(next.slots.alpha._tag).toBe('Loading')
      }), expectNoOutMessage())
  })

  it('activates a loaded page and lifts its init Command', () => {
    const { binding, KitMessage, alphaInitial, pages } = makeKitFixture()
    pages.registry.register('alpha', alphaPage)
    const state = { ...alphaInitial(), slots: { ...alphaInitial().slots, alpha: { _tag: 'Loading' as const } } }
    story(binding.update, given(state), message(KitMessage.LoadedPageModule({ key: 'alpha' })),
      Command.resolve(AlphaInit(), AlphaMessage.AlphaPing()),
      model((next) => expect(next.slots.alpha._tag).toBe('Ready')))
  })

  it('prefetches without initializing and commits a successful prefetch as Available', () => {
    const { binding, KitMessage, alphaInitial } = makeKitFixture()
    story(binding.update, given(alphaInitial()), message(KitMessage.RequestedPrefetch({ key: 'alpha' })),
      Command.expectExact(binding.commands.LoadPageForPrefetch({ key: 'alpha' })),
      Command.resolve(binding.commands.LoadPageForPrefetch, KitMessage.CompletedPrefetch({ key: 'alpha', isLoaded: true })),
      model((next) => expect(next.slots.alpha._tag).toBe('Available')))
  })

  it('leaves a failed prefetch Idle', () => {
    const { binding, KitMessage, alphaInitial } = makeKitFixture()
    story(binding.update, given(alphaInitial()), message(KitMessage.RequestedPrefetch({ key: 'alpha' })),
      Command.resolve(binding.commands.LoadPageForPrefetch, KitMessage.CompletedPrefetch({ key: 'alpha', isLoaded: false })),
      model((next) => expect(next.slots.alpha._tag).toBe('Idle')))
  })

  it('activates an Available page in the route update without a loading step', () => {
    const { binding, KitMessage, alphaInitial, pages } = makeKitFixture()
    pages.registry.register('alpha', alphaPage)
    const state = { ...alphaInitial(), slots: { ...alphaInitial().slots, alpha: { _tag: 'Available' as const } } }
    story(binding.update, given(state), message(KitMessage.EnteredRoute({ keys: ['alpha'] })),
      Command.resolve(AlphaInit(), AlphaMessage.AlphaPing()),
      model((next) => expect(next.slots.alpha._tag).toBe('Ready')))
  })

  it('restores a decodable Dehydrated model without running init', () => {
    const { binding, KitMessage, alphaInitial, pages } = makeKitFixture()
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
    const { binding, KitMessage, alphaInitial, pages } = makeKitFixture()
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
    const { binding, KitMessage, alphaInitial } = makeKitFixture()
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
    const { binding, KitMessage, alphaInitial } = makeKitFixture()
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
    const { binding, KitMessage, alphaInitial, pages } = makeKitFixture()
    pages.registry.register('alpha', alphaPage)
    const state = { ...alphaInitial(), slots: { ...alphaInitial().slots, alpha: {
      _tag: 'Ready' as const,
      model: { maybeNote: Option.none() },
    } } }
    story(binding.update, given(state), message(KitMessage.GotAlphaPageMessage({ message: alphaMessage })),
      expectOutMessage(alphaOutMessage))
  })
  it('lifts page update commands back into the kit union', () => {
    const { binding, KitMessage, alphaInitial, pages } = makeKitFixture()
    pages.registry.register('alpha', alphaPage)
    const state = { ...alphaInitial(), slots: { ...alphaInitial().slots, alpha: {
      _tag: 'Ready' as const,
      model: { maybeNote: Option.none() },
    } } }
    story(binding.update, given(state),
      message(KitMessage.GotAlphaPageMessage({ message: AlphaMessage.AlphaDispatch() })),
      Command.expectExact(AlphaUpdateCommand()),
      Command.resolve(AlphaUpdateCommand(), AlphaMessage.AlphaPing()),
      expectOutMessage(alphaOutMessage))
  })
  it('updates PWA state for events, versions, and failed or completed updates', () => {
    const { binding, KitMessage, alphaInitial } = makeKitFixture()
    const initial = alphaInitial()
    story(binding.update, given(initial),
      message(KitMessage.GotPwaEvent({ event: PwaEvent.ChangedOnlineStatus({ isOnline: false }) })),
      model((next) => expect(next.pwa.isOnline).toBe(false)),
      message(KitMessage.GotPwaEvent({ event: PwaEvent.OfflineReady() })),
      model((next) => expect(next.pwa.isOfflineReady).toBe(true)),
      message(KitMessage.GotPwaEvent({ event: PwaEvent.UpdateAvailable() })),
      model((next) => expect(next.pwa.isUpdateAvailable).toBe(true)),
      message(KitMessage.GotPwaEvent({ event: PwaEvent.RegisterFailed({ reason: 'registration failed' }) })),
      model((next) => expect(next.pwa.isUpdateAvailable).toBe(true)),
      message(KitMessage.NewVersionAvailable({ buildId: 'new-build' })),
      model((next) => expect(next.pwa.maybeNewBuildId).toEqual(Option.some('new-build'))),
      message(KitMessage.FailedApplyUpdate({ reason: 'activation failed' })),
      model((next) => expect(next.pwa.isUpdateAvailable).toBe(true)),
      message(KitMessage.CompletedApplyUpdate({})),
      model((next) => expect(next.pwa.isUpdateAvailable).toBe(false)))
  })
})
