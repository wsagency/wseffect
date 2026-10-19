import { Effect, Option, Stream } from 'effect'
import { Scene, Submodel } from 'foldkit'
import { role, selector, text } from 'foldkit/scene'
import { describe, expect, it, vi } from 'vitest'
import { alphaPage } from './fixtures/pages/alpha.js'
import { makeKitFixture } from './fixtures/kit.js'
import { prefetchOnIntent, prefetchOnVisible } from '../src/view/prefetch.js'
import type { KitBinding } from '../src/kit/binding.js'
type FixtureBinding = ReturnType<typeof makeKitFixture>['binding']
type FixturePages = FixtureBinding extends KitBinding<infer Pages, any> ? Pages : never
type FixtureMessage = FixtureBinding extends KitBinding<any, infer Message> ? Message : never

describe('kit page views', () => {
  it('renders an accessible Loading status', () => {
    const { binding, alphaInitial } = makeKitFixture()
    const state = { ...alphaInitial(), slots: { ...alphaInitial().slots, alpha: { _tag: 'Loading' as const } } }
    Scene.scene({
      update: binding.update,
      view: (model, h) => binding.view(model, { key: 'alpha', inputs: {} }, h),
    }, Scene.given(state), Scene.expect(role('status')).toHaveId('loading-alpha'))
  })

  it('renders a retry action for LoadError and reload for NewVersion', () => {
    const { binding, KitMessage, alphaInitial } = makeKitFixture()
    const loadError = { ...alphaInitial(), slots: { ...alphaInitial().slots, alpha: { _tag: 'Failed' as const, cause: 'LoadError' as const, reason: 'missing chunk' } } }
    Scene.scene({
      update: binding.update,
      view: (model, h) => binding.view(model, { key: 'alpha', inputs: {} }, h),
    }, Scene.given(loadError), Scene.expect(text('Retry')).toExist(),
    Scene.click(text('Retry')), Scene.expect(role('status')).toHaveId('loading-alpha'))

    const newVersion = { ...alphaInitial(), slots: { ...alphaInitial().slots, alpha: { _tag: 'Failed' as const, cause: 'NewVersion' as const, reason: 'new build' } } }
    Scene.scene({
      update: binding.update,
      view: (model, h) => binding.view(model, { key: 'alpha', inputs: {} }, h),
    }, Scene.given(newVersion), Scene.expect(text('Reload')).toExist(),
    Scene.click(text('Reload')), Scene.Command.expectExact(binding.commands.ReloadDocument({})),
    Scene.Command.resolve(binding.commands.ReloadDocument({}), KitMessage.CompletedApplyUpdate({})))
  })

  it('renders the registered page view for a Ready slot', () => {
    const { binding, alphaInitial, pages } = makeKitFixture()
    pages.registry.register('alpha', alphaPage)
    const ready = { ...alphaInitial(), slots: { ...alphaInitial().slots, alpha: { _tag: 'Ready' as const, model: { maybeNote: Option.none() } } } }
    Scene.scene({
      update: binding.update,
      view: (model, h) => binding.view(model, { key: 'alpha', inputs: {} }, h),
    }, Scene.given(ready), Scene.expect(text('(none)')).toExist())
  })

  it('memoizes the page view until a primitive input changes', () => {
    const { binding, KitMessage, alphaInitial, pages } = makeKitFixture()
    let executions = 0
    const view = Submodel.defineView<typeof alphaPage.Model.Type, typeof alphaPage.Message.Type, {}>((model, inputs, h) => {
      executions += 1
      return alphaPage.view(model, inputs, h)
    })
    pages.registry.register('alpha', { ...alphaPage, view })
    const ready = { ...alphaInitial(), slots: { ...alphaInitial().slots, alpha: { _tag: 'Ready' as const, model: { maybeNote: Option.none() } } } }
    let inputs = { revision: 'one' }
    Scene.scene({
      update: binding.update,
      view: (state, h) => binding.view(state, { key: 'alpha', inputs }, h),
    }, Scene.given(ready),
    Scene.Subscription.emit(KitMessage.EnteredRoute({ keys: ['alpha'] })),
    Scene.tap(() => expect(executions).toBe(1)),
    Scene.tap(() => { inputs = { revision: 'two' } }),
    Scene.Subscription.emit(KitMessage.EnteredRoute({ keys: ['alpha'] })),
    Scene.tap(() => expect(executions).toBe(2)))
  })
  it('hides the update banner until an update is available and sends apply on reload', () => {
    const { binding, KitMessage, alphaInitial } = makeKitFixture()
    const view = (state: Parameters<typeof binding.bannerView>[0], h: Parameters<typeof binding.bannerView>[1]) =>
      binding.bannerView(state, h) ?? h.div([], [])
    Scene.scene({ update: binding.update, view }, Scene.given(alphaInitial()),
      Scene.expect(selector('#wseffect-update')).toBeAbsent())
    const available = { ...alphaInitial(), pwa: { ...alphaInitial().pwa, isUpdateAvailable: true } }
    Scene.scene({ update: binding.update, view }, Scene.given(available),
      Scene.expect(text('An update is available.')).toExist(),
      Scene.click(selector('#wseffect-update-reload')),
      Scene.Command.expectExact(binding.commands.ReloadDocument({})),
      Scene.Command.resolve(binding.commands.ReloadDocument({}), KitMessage.CompletedApplyUpdate({})))
  })
})

describe('prefetch intent attributes', () => {
  it('requests prefetch on mouseenter', () => {
    const { binding, KitMessage, alphaInitial } = makeKitFixture()
    const view = (_state: Parameters<typeof binding.view>[0], h: Parameters<typeof binding.view>[2]) =>
      h.button(prefetchOnIntent<FixturePages, FixtureMessage>(binding, 'alpha', h), ['Open page'])
    Scene.scene({ update: binding.update, view }, Scene.given(alphaInitial()),
      Scene.hover(text('Open page')),
      Scene.Command.expectExact(binding.commands.LoadPageForPrefetch({ key: 'alpha' })),
      Scene.Command.resolve(binding.commands.LoadPageForPrefetch({ key: 'alpha' }), KitMessage.CompletedPrefetch({ key: 'alpha', isLoaded: true })))
  })

  it('requests prefetch on focus', () => {
    const { binding, KitMessage, alphaInitial } = makeKitFixture()
    const view = (_state: Parameters<typeof binding.view>[0], h: Parameters<typeof binding.view>[2]) =>
      h.button(prefetchOnIntent<FixturePages, FixtureMessage>(binding, 'alpha', h), ['Open page'])
    Scene.scene({ update: binding.update, view }, Scene.given(alphaInitial()),
      Scene.focus(text('Open page')),
      Scene.Command.expectExact(binding.commands.LoadPageForPrefetch({ key: 'alpha' })),
      Scene.Command.resolve(binding.commands.LoadPageForPrefetch({ key: 'alpha' }), KitMessage.CompletedPrefetch({ key: 'alpha', isLoaded: true })))
  })
  it('attaches an observer mount that requests prefetch on visibility', () => {
    const { binding, KitMessage, alphaInitial } = makeKitFixture()
    const attribute = prefetchOnVisible<FixturePages, FixtureMessage>(binding, 'alpha')
    if (attribute._tag !== 'OnMount') throw new Error('Expected a mount attribute')
    const action = attribute.action
    const view = (_state: Parameters<typeof binding.view>[0], h: Parameters<typeof binding.view>[2]) =>
      h.div([attribute], ['Visible page'])
    Scene.scene({ update: binding.update, view }, Scene.given(alphaInitial()),
      Scene.Mount.expectHas(action),
      Scene.Mount.resolve(action, binding.messages.requestedPrefetch('alpha')),
      Scene.Command.expectExact(binding.commands.LoadPageForPrefetch({ key: 'alpha' })),
      Scene.Command.resolve(binding.commands.LoadPageForPrefetch({ key: 'alpha' }), KitMessage.CompletedPrefetch({ key: 'alpha', isLoaded: true })))
  })
  it('waits for browser idle after visibility before requesting prefetch', async () => {
    const { binding } = makeKitFixture()
    const attribute = prefetchOnVisible<FixturePages, FixtureMessage>(binding, 'alpha')
    if (attribute._tag !== 'OnMount') throw new Error('Expected a mount attribute')

    let makeVisible: (() => void) | undefined
    const observerReady = Promise.withResolvers<void>()
    class TestIntersectionObserver {
      constructor(callback: (entries: Array<{ readonly isIntersecting: boolean }>) => void) {
        makeVisible = () => callback([{ isIntersecting: true }])
        observerReady.resolve()
      }
      observe() {}
      disconnect() {}
    }
    let idleCallback: (() => void) | undefined
    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver)
    vi.stubGlobal('requestIdleCallback', (callback: () => void) => {
      idleCallback = callback
      return 1
    })
    vi.stubGlobal('cancelIdleCallback', vi.fn())

    try {
      const result = Effect.runPromise(Stream.runHead(attribute.action.f(document.createElement('div'), Stream.empty)))
      await observerReady.promise
      makeVisible!()
      expect(idleCallback).toBeDefined()
      let completed = false
      void result.then(() => { completed = true })
      await Promise.resolve()
      expect(completed).toBe(false)
      idleCallback!()
      await expect(result).resolves.toEqual(Option.some(binding.messages.requestedPrefetch('alpha')))
    } finally {
      vi.unstubAllGlobals()
    }
  })
  it('uses a timer fallback when requestIdleCallback is unavailable', async () => {
    const { binding } = makeKitFixture()
    const attribute = prefetchOnVisible<FixturePages, FixtureMessage>(binding, 'alpha')
    if (attribute._tag !== 'OnMount') throw new Error('Expected a mount attribute')

    let makeVisible: (() => void) | undefined
    const observerReady = Promise.withResolvers<void>()
    class TestIntersectionObserver {
      constructor(callback: (entries: Array<{ readonly isIntersecting: boolean }>) => void) {
        makeVisible = () => callback([{ isIntersecting: true }])
        observerReady.resolve()
      }
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver)
    vi.stubGlobal('requestIdleCallback', undefined)

    try {
      const result = Effect.runPromise(Stream.runHead(attribute.action.f(document.createElement('div'), Stream.empty)))
      await observerReady.promise
      vi.useFakeTimers()
      const timersBeforeVisibility = vi.getTimerCount()
      makeVisible!()
      expect(vi.getTimerCount()).toBe(timersBeforeVisibility + 1)
      let completed = false
      void result.then(() => { completed = true })
      await Promise.resolve()
      expect(completed).toBe(false)
      await vi.runAllTimersAsync()
      await expect(result).resolves.toEqual(Option.some(binding.messages.requestedPrefetch('alpha')))
    } finally {
      vi.unstubAllGlobals()
      vi.useRealTimers()
    }
  })
  it('keeps visible mounts associated with their binding', () => {
    const first = makeKitFixture()
    const second = makeKitFixture()
    const firstAttribute = prefetchOnVisible<FixturePages, FixtureMessage>(first.binding, 'alpha')
    const secondAttribute = prefetchOnVisible<FixturePages, FixtureMessage>(second.binding, 'alpha')
    if (firstAttribute._tag !== 'OnMount' || secondAttribute._tag !== 'OnMount') {
      throw new Error('Expected mount attributes')
    }

    const firstView = (_state: Parameters<typeof first.binding.view>[0], h: Parameters<typeof first.binding.view>[2]) =>
      h.div([firstAttribute], ['First visible page'])
    Scene.scene({ update: first.binding.update, view: firstView }, Scene.given(first.alphaInitial()),
      Scene.Mount.expectHas(firstAttribute.action),
      Scene.Mount.resolve(firstAttribute.action, first.binding.messages.requestedPrefetch('alpha')),
      Scene.Command.expectExact(first.binding.commands.LoadPageForPrefetch({ key: 'alpha' })),
      Scene.Command.resolve(first.binding.commands.LoadPageForPrefetch({ key: 'alpha' }), first.KitMessage.CompletedPrefetch({ key: 'alpha', isLoaded: true })))

    const secondView = (_state: Parameters<typeof second.binding.view>[0], h: Parameters<typeof second.binding.view>[2]) =>
      h.div([secondAttribute], ['Second visible page'])
    Scene.scene({ update: second.binding.update, view: secondView }, Scene.given(second.alphaInitial()),
      Scene.Mount.expectHas(secondAttribute.action),
      Scene.Mount.resolve(secondAttribute.action, second.binding.messages.requestedPrefetch('alpha')),
      Scene.Command.expectExact(second.binding.commands.LoadPageForPrefetch({ key: 'alpha' })),
      Scene.Command.resolve(second.binding.commands.LoadPageForPrefetch({ key: 'alpha' }), second.KitMessage.CompletedPrefetch({ key: 'alpha', isLoaded: true })))
  })
})
