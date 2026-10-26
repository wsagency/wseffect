import { Effect, Fiber, Option, Stream } from 'effect'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import type * as Mount from '@wsagency/wseffect-foldkit/mount'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { expect, it, vi } from 'vitest'
import * as Listbox from '../listbox/public.js'
import * as Select from './index.js'

type Value = 'one' | 'two'
const config: Select.Config<Value> = {
  id: 'choice', selectedValue: Option.some('two'), position: 'item-aligned', isModal: false,
  items: [
    { value: 'one', textValue: 'One', isDisabled: false, content: 'One' },
    { value: 'two', textValue: 'Two', isDisabled: false, content: 'Two' },
  ],
}
const captureOnMount = (
  select: Select.Bundle<Value>,
  viewInputs: Select.Config<Value>,
  actions: Array<Mount.MountAction<Select.SelectMessage>>,
) => (model: Select.SelectModel, h: HtmlBuilder<Select.SelectMessage>) => {
  const instrumented = new Proxy(h, {
    get: (target, key, receiver) => {
      const value = Reflect.get(target, key, receiver)
      if (key === 'OnMount') return (action: Mount.MountAction<Select.SelectMessage>) => {
        actions.push(action)
        return value.call(target, action)
      }
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
  return select.view(model, viewInputs, instrumented)
}
const acknowledgeAnchor = Scene.Mount.resolve(Listbox.AnchorListbox, Listbox.Message.CompletedAnchorListbox())
const acknowledgeBackdrop = Scene.Mount.resolve(Listbox.PortalListboxBackdrop, Listbox.Message.CompletedPortalListboxBackdrop())

it('uses the trigger as the external anchor and resolves active before selected item', () => {
  const actions: Array<Mount.MountAction<Select.SelectMessage>> = []
  const select = Select.createSelect<Value>()
  const update = (model: Select.SelectModel, message: Select.SelectMessage) => select.update(model, message)
  const model = select.update(
    select.init(config),
    Listbox.Message.Opened({ maybeActiveItemIndex: Option.none() }),
  ).model
  Scene.scene(
    { update, view: captureOnMount(select, config, actions) },
    Scene.given(model), acknowledgeAnchor, acknowledgeBackdrop,
  )
  const itemAlignedAnchor = actions.find(action => action.name === 'AnchorListbox')
  expect(itemAlignedAnchor?.args?.['buttonId']).toBe('choice-button')
  expect(itemAlignedAnchor?.args?.['selectedItemId']).toBe('choice-item-1')

  actions.length = 0
  const activeConfig = { ...config, selectedValue: Option.none() }
  const activeSelect = Select.createSelect<Value>()
  const activeModel = activeSelect.update(
    activeSelect.init(activeConfig),
    Listbox.Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
  ).model
  Scene.scene(
    { update: activeSelect.update, view: captureOnMount(activeSelect, activeConfig, actions) },
    Scene.given(activeModel), acknowledgeAnchor, acknowledgeBackdrop,
  )
  expect(actions.find(action => action.name === 'AnchorListbox')?.args?.['selectedItemId']).toBe('choice-item-0')

  actions.length = 0
  const popperConfig: Select.Config<Value> = { ...config, position: 'popper' }
  const popper = Select.createSelect<Value>()
  const popperModel = popper.update(
    popper.init(popperConfig),
    Listbox.Message.Opened({ maybeActiveItemIndex: Option.none() }),
  ).model
  Scene.scene(
    { update: popper.update, view: captureOnMount(popper, popperConfig, actions) },
    Scene.given(popperModel), acknowledgeAnchor, acknowledgeBackdrop,
  )
  const popperAnchor = actions.find(action => action.name === 'AnchorListbox')
  expect(popperAnchor?.args?.['buttonId']).toBe('choice-button')
  expect(popperAnchor?.args?.['selectedItemId']).toBeUndefined()
})

const rect = (top: number, width: number, height: number) => ({
  x: 10,
  y: top,
  top,
  left: 10,
  right: 10 + width,
  bottom: top + height,
  width,
  height,
  toJSON: () => ({}),
})

const positionWithItem = async (itemTop?: number) => {
  let disconnected = 0
  let positioned: { top: string; left: string; minWidth: string } | undefined
  let observed!: () => void
  const observerReady = new Promise<void>(resolve => { observed = resolve })
  class Observer {
    constructor(_callback: ResizeObserverCallback) {}
    observe(): void {
      positioned = {
        top: panel.style.top,
        left: panel.style.left,
        minWidth: panel.style.minWidth,
      }
      observed()
    }
    disconnect(): void { disconnected += 1 }
  }
  vi.stubGlobal('ResizeObserver', Observer)
  const trigger = document.createElement('button')
  trigger.id = 'trigger'
  const panel = document.createElement('div')
  panel.id = 'panel'
  const item = document.createElement('div')
  item.id = 'selected'
  if (itemTop !== undefined) panel.append(item)
  document.body.append(trigger, panel)
  vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(rect(100, 80, 30))
  vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue(rect(20, 80, 180))
  vi.spyOn(item, 'getBoundingClientRect').mockReturnValue(rect(itemTop ?? 70, 80, 20))

  const action = Listbox.AnchorListbox({
    buttonId: 'trigger',
    anchor: {},
    selectedItemId: 'selected',
  })
  const result = await Effect.runPromise(Effect.race(
    Stream.runHead(action.f(panel, Stream.empty)).pipe(Effect.as('finished')),
    Effect.promise(() => observerReady).pipe(Effect.as('observed')),
  ))
  expect(result).toBe('observed')
  const geometry = { ...positioned, disconnected }
  trigger.remove()
  panel.remove()
  vi.unstubAllGlobals()
  return geometry
}

it('aligns the selected item with trigger geometry and disconnects its observer', async () => {
  expect(await positionWithItem(70)).toEqual({
    top: '50px', left: '10px', minWidth: '80px', disconnected: 1,
  })
})

it('falls back to trigger placement when the selected item is absent', async () => {
  expect(await positionWithItem(undefined)).toEqual({
    top: '100px', left: '10px', minWidth: '80px', disconnected: 1,
  })
})
it('no-ops selected-or-active anchoring when its trigger is absent', async () => {
  const panel = document.createElement('div')
  panel.style.visibility = 'hidden'
  const getRootNode = vi.spyOn(panel, 'getRootNode')
  const action = Listbox.AnchorListbox({
    buttonId: 'missing-trigger',
    anchor: {},
    anchorMode: 'SelectedOrActiveItem',
  })
  const fiber = Effect.runFork(Stream.runDrain(action.f(panel, Stream.never)))
  try {
    await vi.waitFor(() => expect(getRootNode).toHaveBeenCalled())
    expect(panel.style.visibility).toBe('hidden')
    expect(panel.style.position).toBe('')
  } finally {
    await Effect.runPromise(Fiber.interrupt(fiber))
  }
})


const createPositioningFixture = async (
  inShadowRoot: boolean,
  longList: boolean,
  useAnchorMode = false,
) => {
  let resolveObserved!: () => void
  const observed = new Promise<void>(resolve => { resolveObserved = resolve })
  class Observer {
    constructor(_callback: ResizeObserverCallback) {}
    observe(): void { resolveObserved() }
    unobserve(): void {}
    disconnect(): void {}
  }
  vi.stubGlobal('ResizeObserver', Observer)
  const host = document.createElement('div')
  const root = inShadowRoot ? host.attachShadow({ mode: 'open' }) : document.body
  if (inShadowRoot) document.body.append(host)
  const trigger = document.createElement('button')
  trigger.id = 'trigger'
  const panel = document.createElement('div')
  panel.id = 'panel'
  panel.tabIndex = -1
  panel.style.visibility = 'hidden'
  const selected = document.createElement('div')
  selected.id = 'selected'
  selected.setAttribute('data-selected', '')
  const active = document.createElement('div')
  active.id = 'active'
  if (useAnchorMode) active.setAttribute('data-active', '')
  panel.append(selected, active)
  root.append(trigger, panel)
  vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(rect(80, 80, 24) as DOMRect)
  vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue(rect(20, 80, 40) as DOMRect)
  vi.spyOn(selected, 'getBoundingClientRect').mockReturnValue(rect(60, 80, 20) as DOMRect)
  vi.spyOn(active, 'getBoundingClientRect').mockReturnValue(rect(90, 80, 20) as DOMRect)
  if (longList) {
    Object.defineProperty(panel, 'scrollHeight', { configurable: true, value: 200 })
    selected.scrollIntoView = vi.fn()
  }
  const action = Listbox.AnchorListbox({
    buttonId: 'trigger',
    anchor: {},
    ...(useAnchorMode
      ? { anchorMode: 'SelectedOrActiveItem' as const }
      : { selectedItemId: 'selected' }),
  })
  const fiber = Effect.runFork(Stream.runDrain(action.f(panel, Stream.never)))
  await observed
  return {
    host,
    trigger,
    panel,
    selected,
    active,
    fiber,
    cleanup: async () => {
      await Effect.runPromise(Fiber.interrupt(fiber))
      trigger.remove()
      panel.remove()
      host.remove()
      vi.unstubAllGlobals()
    },
  }
}

it('fits a long item-aligned list inside the viewport and scrolls the selection into view', async () => {
  const initialHeight = window.innerHeight
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 100 })
  const fixture = await createPositioningFixture(false, true)
  try {
    expect(fixture.panel.style.visibility).toBe('')
    expect(fixture.panel.style.top).toBe('8px')
    expect(fixture.panel.style.maxHeight).toBe('84px')
    expect(fixture.panel.style.overflowY).toBe('auto')
    expect(fixture.selected.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
  } finally {
    await fixture.cleanup()
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: initialHeight })
  }
})

it('resolves an item-aligned trigger inside its shadow root', async () => {
  const fixture = await createPositioningFixture(true, false)
  try {
    expect(fixture.panel.style.visibility).toBe('')
    expect(fixture.panel.style.left).toBe('10px')
    expect(fixture.panel.style.top).toBe('40px')
  } finally {
    await fixture.cleanup()
  }
})

it('re-aligns to the current active item after a DOM patch', async () => {
  const fixture = await createPositioningFixture(false, false)
  try {
    expect(fixture.panel.style.top).toBe('40px')
    fixture.active.setAttribute('data-active', '')
    await vi.waitFor(() => expect(fixture.panel.style.top).toBe('10px'))
  } finally {
    await fixture.cleanup()
  }
})

it('uses the active item when SelectedOrActiveItem mode has no selection', async () => {
  const fixture = await createPositioningFixture(false, false, true)
  try {
    expect(fixture.panel.style.visibility).toBe('')
    expect(fixture.panel.style.top).toBe('10px')
  } finally {
    await fixture.cleanup()
  }
})
