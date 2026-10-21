import { Option } from 'effect'
import * as RadioGroupUi from '@foldkit/ui/radioGroup'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as RadioGroup from '../src/components/radio-group.js'
import { defineMessageUnion } from 'foldkit/message'
const Group = RadioGroup.create<'one' | 'two' | 'three'>()
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: RadioGroup.Model, message: RadioGroup.Message | Message) => message._tag === 'Tick' ? { model } : Group.update(model, message)
const view = (model: RadioGroup.Model, h: HtmlBuilder<RadioGroup.Message | Message>) => Group.view(model, { options: [{ value: 'one', label: h.span([], ['One']) }, { value: 'two', label: h.span([], ['Two']), isDisabled: true }, { value: 'three', label: h.span([], ['Three']) }], selectedValue: Option.some('one'), ariaLabel: 'Choice', orientation: 'Horizontal' }, h as HtmlBuilder<RadioGroup.Message>)
describe('RadioGroup', () => {
  it('arrows and Home End skip disabled items', () => Scene.scene({ update, view }, Scene.given(Group.init({ id: 'plans' })), Scene.keydown(Scene.selector('[role="radio"]'), 'ArrowRight'), Scene.Command.resolve(RadioGroupUi.FocusOption, RadioGroupUi.Message.CompletedFocusOption()), Scene.expect(Scene.selector('[role="radio"][data-active]')).toExist()))
})
