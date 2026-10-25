import { Option } from 'effect'
import * as Listbox from '../listbox/public.js'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { it } from 'vitest'
import * as Select from './index.js'

const bundle = Select.createSelect<'one' | 'two' | 'three'>()
const config: Select.Config<'one' | 'two' | 'three'> = {
  id: 'choice', selectedValue: Option.none(), position: 'item-aligned', isModal: false,
  items: [
    {
      id: 'warm', label: null, items: [
        { value: 'one', textValue: 'One', isDisabled: false, content: 'One' },
        { kind: 'separator', id: 'line' },
        { value: 'two', textValue: 'Two', isDisabled: true, content: 'Two' },
        { value: 'three', textValue: 'Three', isDisabled: false, content: 'Three' },
      ],
    },
  ],
}
const opened = bundle.update(
  bundle.init(config),
  Listbox.Message.Opened({ maybeActiveItemIndex: Option.some(0) }),
).model
const acknowledgeAnchor = Scene.Mount.resolve(Listbox.AnchorListbox, Listbox.Message.CompletedAnchorListbox())
const acknowledgeBackdrop = Scene.Mount.resolve(Listbox.PortalListboxBackdrop, Listbox.Message.CompletedPortalListboxBackdrop())
const update = (model: Select.SelectModel, message: Select.SelectMessage) => bundle.update(model, message)
const render = (model: Select.SelectModel, h: HtmlBuilder<Select.SelectMessage>) => bundle.view(model, {
  ...config,
  items: [{ ...config.items[0]!, label: h.span([], ['Warm Colors']) }],
}, h)

it('exposes labelled listbox, option, disabled and separator semantics', () => {
  Scene.scene(
    { update, view: render },
    Scene.given(opened),
    acknowledgeAnchor,
    acknowledgeBackdrop,
    Scene.expect(Scene.role('listbox', { name: 'choice' })).toExist(),
    Scene.expect(Scene.role('group', { name: 'Warm Colors' })).toExist(),
    Scene.expect(Scene.role('option', { name: 'One' })).toExist(),
    Scene.expect(Scene.role('option', { name: 'Two' })).toHaveAttr('aria-disabled', 'true'),
    Scene.expect(Scene.role('separator')).toExist(),
  )
})

it('typeahead skips disabled options and separators', () => {
  Scene.scene(
    { update, view: render },
    Scene.given(opened),
    acknowledgeAnchor,
    acknowledgeBackdrop,
    Scene.keydown(Scene.role('listbox', { name: 'choice' }), 't'),
    Scene.Command.resolve(Listbox.DelayClearSearch, Listbox.Message.CompletedDelayClearSearch({ version: 1 })),
    Scene.expect(Scene.selector('#choice-item-2')).toHaveAttr('data-active', 'true'),
  )
})

it('arrow navigation skips disabled options between enabled items', () => {
  Scene.scene(
    { update, view: render },
    Scene.given(opened),
    acknowledgeAnchor,
    acknowledgeBackdrop,
    Scene.keydown(Scene.selector('#choice-items'), 'ArrowDown'),
    Scene.Command.resolve(Listbox.ScrollIntoView({ id: 'choice', index: 2 }), Listbox.Message.CompletedScrollIntoView()),
    Scene.expect(Scene.selector('#choice-item-2')).toHaveAttr('data-active', 'true'),
  )
})
