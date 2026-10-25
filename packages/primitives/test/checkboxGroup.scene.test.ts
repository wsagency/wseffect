import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { it } from 'vitest'
import { view } from '../src/checkbox-group.js'

type Model = { selected: ReadonlySet<string> }
type Message = never
const update = (model: Model, _message: Message) => ({ model })
const render = (model: Model, h: HtmlBuilder<Message>) => view({
  id: 'choices',
  label: h.span([], ['Choices']),
  options: [
    { value: 'alpha', label: h.span([], ['Alpha']), isDisabled: false },
    { value: 'beta', label: h.span([], ['Beta']), isDisabled: true },
  ],
  selected: model.selected,
  toggleMessage: () => { throw new Error('not clicked') },
}, h)
it('labelled group exposes checked state', () => {
  Scene.scene(
    { update, view: render },
    Scene.given({ selected: new Set(['alpha']) }),
    Scene.expect(Scene.role('group', { name: 'Choices' })).toExist(),
    Scene.expect(Scene.role('checkbox')).toHaveAttr('aria-checked', 'true'),
    Scene.expect(Scene.selector('input[type="checkbox"][disabled]')).toExist(),
  )
})
