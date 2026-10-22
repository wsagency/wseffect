import * as Scene from 'foldkit/scene'
import { describe, expect, it } from 'vitest'
import { pageKeysForRoute } from '../src/routes.js'
import { page as signalsPage, Message as SignalsMessage } from '../src/pages/signals.js'
import { page as validationPage, Message as ValidationMessage } from '../src/pages/validation.js'
import { page as persistencePage, Message as PersistenceMessage } from '../src/pages/persistence.js'
import { page as browserPage, Message as BrowserMessage } from '../src/pages/browser.js'
import { page as islandPage, Message as IslandMessage } from '../src/pages/island.js'

const inputs = {
  path: '/capabilities',
  date: '2026-10-19', accentColor: 'indigo', grayColor: 'auto', radius: 'medium',
  scaling: '100%', appearance: 'inherit', panelBackground: 'translucent',
} as const

describe('Gallery app capability demos', () => {
  it('capabilityRoutesAreLazy', () => {
    expect(pageKeysForRoute('/capabilities')).toEqual(['capabilities'])
    expect(pageKeysForRoute('/capabilities/signals')).toEqual(['signals'])
    expect(pageKeysForRoute('/capabilities/validation')).toEqual(['validation'])
    expect(pageKeysForRoute('/capabilities/persistence')).toEqual(['persistence'])
    expect(pageKeysForRoute('/capabilities/browser')).toEqual(['browser'])
    expect(pageKeysForRoute('/capabilities/island')).toEqual(['island'])
  })

  it('renders signal controls without opening a stream until requested', () => {
    const initial = signalsPage.init()
    Scene.scene(
      { update: signalsPage.update, view: (model, h) => signalsPage.view(model, inputs, h) },
      Scene.given(initial.model),
      Scene.expect(Scene.selector('#signal-count')).toHaveText('0'),
      Scene.expect(Scene.selector('#signal-status')).toHaveText('Waiting for a signal'),
    )
  })
  it('onlyIfMissingPreservesZeroSignalCount', () => {
    const initial = signalsPage.init()
    Scene.scene(
      { update: signalsPage.update, view: (model, h) => signalsPage.view(model, inputs, h) },
      Scene.given(initial.model),
      Scene.Subscription.emit(SignalsMessage.SignalOutcomeReceived({
        outcome: { _tag: 'SignalPatch', value: { count: 5 }, onlyIfMissing: true },
      })),
      Scene.expect(Scene.selector('#signal-count')).toHaveText('0'),
    )
  })

  it('nativeValidationTransitions', () => {
    const initial = validationPage.init()
    const invalidCommand = validationPage.update(initial.model, ValidationMessage.Validate()).commands?.[0]
    const invalidModel = validationPage.update(initial.model, ValidationMessage.ValidationProjected({ result: 'Invalid (native checkValidity: false)', error: 'Enter a name' })).model
    const edited = validationPage.update(invalidModel, ValidationMessage.NameChanged({ value: 'Gallery' }))
    const clearCommand = edited.commands?.[0]
    const validCommand = validationPage.update(edited.model, ValidationMessage.Validate()).commands?.[0]
    Scene.scene(
      { update: validationPage.update, view: (model, h) => validationPage.view(model, inputs, h) },
      Scene.given(initial.model),
      Scene.Mount.resolve({ name: 'GalleryValidationProjection' }, ValidationMessage.ValidationProjected({ result: 'Not validated', error: '' })),
      Scene.expect(Scene.selector('.capability-stack')).toExist(),
      Scene.expect(Scene.selector('#validation-name.rt-TextFieldInput')).toExist(),
      Scene.expect(Scene.selector('#name-error')).toBeAbsent(),
      Scene.click(Scene.selector('#validation-submit button')),
      Scene.Command.resolve(invalidCommand!, ValidationMessage.ValidationProjected({ result: 'Invalid (native checkValidity: false)', error: 'Enter a name' })),
      Scene.expect(Scene.selector('#name-error')).toHaveText('Enter a name'),
      Scene.expect(Scene.selector('#validation-name')).toHaveAttr('aria-describedby', 'name-error'),
      Scene.expect(Scene.selector('#validation-result')).toHaveText('Invalid (native checkValidity: false)'),
      Scene.type('#validation-name', 'Gallery'),
      Scene.Command.resolve(clearCommand!, ValidationMessage.ValidationProjected({ result: 'Not validated', error: '' })),
      Scene.click(Scene.selector('#validation-submit button')),
      Scene.Command.resolve(validCommand!, ValidationMessage.ValidationProjected({ result: 'Valid', error: '' })),
      Scene.expect(Scene.selector('#validation-result')).toHaveText('Valid'),
    )
  })

  it('persistenceRestoresAndReportsFailure', () => {
    const initial = persistencePage.init()
    const failed = persistencePage.update(initial.model, PersistenceMessage.PersistenceFailed({ operation: 'Restore', reason: 'Storage unavailable' })).model
    Scene.scene(
      { update: persistencePage.update, view: (model, h) => persistencePage.view(model, inputs, h) },
      Scene.given(failed),
      Scene.Mount.resolve({ name: 'GalleryCapabilityPersistence' }, PersistenceMessage.PersistenceFailed({ operation: 'Restore', reason: 'Storage unavailable' })),
      Scene.expect(Scene.selector('.capability-stack')).toExist(),
      Scene.expect(Scene.selector('#persistence-value.rt-TextFieldInput')).toExist(),
      Scene.expect(Scene.selector('#persistence-status')).toHaveText('Persistence failure (Restore): Storage unavailable'),
      Scene.expect(Scene.selector('#persistence-status .rt-Text[data-accent-color="red"]')).toExist(),
    )
  })

  it('breakpointLocaleClipboardScrollResizeBehaviors', () => {
    const initial = browserPage.init()
    Scene.scene(
      { update: browserPage.update, view: (model, h) => browserPage.view(model, inputs, h) },
      Scene.given(initial.model),
      Scene.Mount.resolve({ name: 'GalleryCapabilityBreakpoint' }, BrowserMessage.BreakpointChanged({ value: 'md' })),
      Scene.Mount.resolve({ name: 'ResizeObserver' }, BrowserMessage.ResizeReported({ result: { _tag: 'Resized', width: 180, height: 48 } })),
      Scene.expect(Scene.selector('#breakpoint-value')).toHaveText('md'),
      Scene.expect(Scene.selector('#locale-number')).toHaveText('1.234,5'),
      Scene.expect(Scene.selector('#clipboard-status')).toExist(),
      Scene.expect(Scene.selector('#scroll-target')).toExist(),
      Scene.expect(Scene.selector('#resize-value')).toHaveText('180 × 48'),
      Scene.expect(Scene.selector('#capability-breakpoint')).toExist(),
      Scene.expect(Scene.selector('#capability-locale')).toExist(),
      Scene.expect(Scene.selector('#capability-clipboard')).toExist(),
      Scene.expect(Scene.selector('#capability-scroll')).toExist(),
      Scene.expect(Scene.selector('#capability-resize')).toExist(),
    )
  })

  it('islandRejectsOutOfRootPatch', () => {
    const initial = islandPage.init()
    Scene.scene(
      { update: islandPage.update, view: (model, h) => islandPage.view(model, inputs, h) },
      Scene.given(initial.model),
      Scene.Mount.resolve({ name: 'IslandPatches' }, IslandMessage.IslandUpdated({ result: { _tag: 'RejectedIslandPatch', reason: 'Target is outside the island root' } })),
      Scene.expect(Scene.selector('#outside-island')).toHaveText('Outside content unchanged'),
      Scene.expect(Scene.selector('#trusted-island-region')).toExist(),
      Scene.expect(Scene.selector('#island-apply-inside')).toExist(),
      Scene.expect(Scene.selector('#island-status')).toBeAbsent(),
      Scene.expect(Scene.selector('#island-log')).toHaveText('RejectedIslandPatch: Target is outside the island root'),
    )
  })

})
