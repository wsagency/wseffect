import { Option } from 'effect'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import type * as Mount from '@wsagency/wseffect-foldkit/mount'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { expect, it } from 'vitest'
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

it('anchors item-aligned panels to the selected item and popper panels to their trigger', () => {
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
  expect(actions.find(action => action.name === 'AnchorListbox')?.args?.['buttonId']).toBe('choice-item-1')

  actions.length = 0
  const popperConfig: Select.Config<Value> = { ...config, position: 'popper' }
  const popper = Select.createSelect<Value>()
  const updatePopper = (current: Select.SelectModel, message: Select.SelectMessage) => popper.update(current, message)
  const popperModel = popper.update(
    popper.init(popperConfig),
    Listbox.Message.Opened({ maybeActiveItemIndex: Option.none() }),
  ).model
  Scene.scene(
    { update: updatePopper, view: captureOnMount(popper, popperConfig, actions) },
    Scene.given(popperModel), acknowledgeAnchor, acknowledgeBackdrop,
  )
  expect(actions.find(action => action.name === 'AnchorListbox')?.args?.['buttonId']).toBe('choice-button')
})
