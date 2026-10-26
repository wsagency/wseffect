import { Effect, Option, Stream } from 'effect'
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
  let observed!: () => void
  const observerReady = new Promise<void>(resolve => { observed = resolve })
  class Observer {
    constructor(_callback: ResizeObserverCallback) {}
    observe(): void { observed() }
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
  const geometry = {
    top: panel.style.top,
    left: panel.style.left,
    minWidth: panel.style.minWidth,
    disconnected,
  }
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
