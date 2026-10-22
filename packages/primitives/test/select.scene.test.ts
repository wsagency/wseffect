import { Option } from 'effect'
import * as Listbox from '@foldkit/ui/listbox'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { it } from 'vitest'
import * as Select from '../src/select.js'

const bundle = Select.createSelect<'one' | 'two'>()
const config: Select.SelectConfig<'one' | 'two'> = {
  id: 'choice', selectedValue: Option.none(), position: 'item-aligned', isModal: false,
  items: [
    { value: 'one', textValue: 'One', isDisabled: true, content: null },
    { kind: 'separator', id: 'divide' },
    { value: 'two', textValue: 'Two', isDisabled: false, content: null },
  ],
}
const opened = bundle.update(bundle.init(config), Listbox.Message.Opened({ maybeActiveItemIndex: Option.some(0) })).model
const update = (model: Select.SelectModel, message: Select.SelectMessage) => bundle.update(model, message)
const render = (model: Select.SelectModel, h: HtmlBuilder<Select.SelectMessage>) => bundle.view(model, config, h)
const popperConfig: Select.SelectConfig<'one' | 'two'> = { ...config, position: 'popper' }
const popperModel = bundle.init(popperConfig)
const renderPopper = (model: Select.SelectModel, h: HtmlBuilder<Select.SelectMessage>) => bundle.view(model, popperConfig, h)

it('exposes labelled listbox semantics', () => {
  Scene.scene(
    { update, view: render },
    Scene.given(opened),
    Scene.expect(Scene.role('listbox', { name: 'choice' })).toExist(),
    Scene.expect(Scene.selector('[role="option"]')).toExist(),
    Scene.expect(Scene.selector('[role="option"][aria-disabled="true"]')).toExist(),
    Scene.expect(Scene.selector('[role="separator"]')).toExist(),
  )
})

it('typeahead skips disabled options and separators', () => {
  Scene.scene(
    { update, view: render },
    Scene.given(opened),
    Scene.keydown(Scene.role('listbox', { name: 'choice' }), 't'),
    Scene.Command.resolve(Listbox.DelayClearSearch, Listbox.Message.CompletedDelayClearSearch({ version: 1 })),
    Scene.expect(Scene.selector('#choice-item-2')).toHaveAttr('data-active', 'true'),
  )
})

it('arrow navigation skips disabled options between enabled items', () => {
  const arrowConfig: Select.SelectConfig<'one' | 'two' | 'three'> = {
    ...config,
    selectedValue: Option.some('one'),
    items: [
      { value: 'one', textValue: 'One', isDisabled: false, content: null },
      { value: 'two', textValue: 'Two', isDisabled: true, content: null },
      { value: 'three', textValue: 'Three', isDisabled: false, content: null },
    ],
  }
  const arrowBundle = Select.createSelect<'one' | 'two' | 'three'>()
  const arrowModel = arrowBundle.update(arrowBundle.init(arrowConfig), Listbox.Message.Opened({ maybeActiveItemIndex: Option.some(0) })).model
  const arrowUpdate = (model: Select.SelectModel, message: Select.SelectMessage) => arrowBundle.update(model, message)
  const arrowRender = (model: Select.SelectModel, h: HtmlBuilder<Select.SelectMessage>) => arrowBundle.view(model, arrowConfig, h)
  Scene.scene(
    { update: arrowUpdate, view: arrowRender },
    Scene.given(arrowModel),
    Scene.keydown(Scene.role('listbox', { name: 'choice' }), 'ArrowDown'),
    Scene.Command.resolve(Listbox.ScrollIntoView({ id: 'choice', index: 2 }), Listbox.Message.CompletedScrollIntoView()),
    Scene.expect(Scene.selector('#choice-item-2')).toHaveAttr('data-active', 'true'),
  )
})
it('uses the upstream Listbox renderer for popper positioning', () => {
  Scene.scene(
    { update, view: renderPopper },
    Scene.given(popperModel),
    Scene.expect(Scene.role('combobox', { name: 'choice' })).toExist(),
  )
})
it('keeps the default item-aligned renderer headless', () => {
  const groupedConfig: Select.SelectConfig<'one' | 'two'> = {
    ...config,
    items: [{
      id: 'group',
      label: null,
      items: [
        { value: 'one', textValue: 'One', isDisabled: false, content: null },
        { kind: 'separator', id: 'divide' },
        { value: 'two', textValue: 'Two', isDisabled: false, content: null },
      ],
    }],
  }
  const model = bundle.update(
    bundle.init(groupedConfig),
    Listbox.Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
  ).model
  Scene.scene(
    { update, view: (current, h) => bundle.view(current, groupedConfig, h) },
    Scene.given(model),
    Scene.expect(Scene.selector('.rt-SelectItem')).not.toExist(),
    Scene.expect(Scene.selector('.rt-SelectGroup')).not.toExist(),
    Scene.expect(Scene.selector('.rt-SelectLabel')).not.toExist(),
    Scene.expect(Scene.selector('.rt-SelectSeparator')).not.toExist(),
    Scene.expect(Scene.selector('.rt-SelectViewport')).not.toExist(),
  )
})
