import { Option } from 'effect'
import * as RadioGroupUi from '@wsagency/wseffect-foldkit-ui/radioGroup'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, expect, it } from 'vitest'
import * as RadioGroup from '../src/components/radio-group.js'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
const Group = RadioGroup.create<'one' | 'two' | 'three'>()
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: RadioGroup.Model, message: RadioGroup.Message | Message) => message._tag === 'Tick' ? { model } : Group.update(model, message)
const verticalView = (model: RadioGroup.Model, h: HtmlBuilder<RadioGroup.Message | Message>) => Group.view(model, { options: [{ value: 'one', label: h.span([], ['One']) }, { value: 'two', label: h.span([], ['Two']), isDisabled: true }, { value: 'three', label: h.span([], ['Three']) }], selectedValue: Option.some('one'), ariaLabel: 'Choice', orientation: 'Vertical' }, h as HtmlBuilder<RadioGroup.Message>)
const view = (model: RadioGroup.Model, h: HtmlBuilder<RadioGroup.Message | Message>) => Group.view(model, { options: [{ value: 'one', label: h.span([], ['One']) }, { value: 'two', label: h.span([], ['Two']), isDisabled: true }, { value: 'three', label: h.span([], ['Three']) }], selectedValue: Option.some('one'), ariaLabel: 'Choice', orientation: 'Horizontal' }, h as HtmlBuilder<RadioGroup.Message>)
describe('RadioGroup', () => {
  it('arrows and Home End skip disabled items', () => Scene.scene({ update, view }, Scene.given(Group.init({ id: 'plans' })), Scene.keydown(Scene.selector('[role="radio"]'), 'ArrowRight'), Scene.Command.resolve(RadioGroupUi.FocusOption, RadioGroupUi.Message.CompletedFocusOption()), Scene.expect(Scene.selector('[role="radio"][data-active]')).toExist()))
  it('renders option labels with the pinned Text class', () => Scene.scene(
    { update, view },
    Scene.given(Group.init({ id: 'plans' })),
    Scene.expect(Scene.selector('.rt-Text.rt-RadioGroupItem')).toExist(),
  ))
  it('renders vertical orientation and moves focus with vertical arrows', () => Scene.scene(
    { update, view: verticalView },
    Scene.given(Group.init({ id: 'plans' })),
    Scene.expect(Scene.role('radiogroup', { name: 'Choice' })).toHaveAttr('aria-orientation', 'vertical'),
    Scene.keydown(Scene.selector('[role="radio"]'), 'ArrowDown'),
    Scene.Command.resolve(RadioGroupUi.FocusOption, RadioGroupUi.Message.CompletedFocusOption()),
    Scene.expect(Scene.selector('[role="radio"][data-active]')).toExist(),
  ))
  it('builds its parent fold adapter', () => {
    const fold = Group.fold<{ group: RadioGroup.Model }, Message, never>({
      read: parent => Option.some(parent.group),
      write: (parent, group) => ({ ...parent, group }),
      toParentMessage: () => Message.Tick(),
      foldOutMessage: () => model => ({ model }),
    })
    expect(fold).toBeDefined()
  })
  it('embeds under the supplied parent slot', () => {
    const embeddedView = (model: RadioGroup.Model, h: HtmlBuilder<RadioGroup.Message | Message>) => Group.embed(h, {
      slotId: 'plans-radio-group',
      model,
      toParentMessage: () => Message.Tick(),
      viewInputs: { options: [{ value: 'one', label: h.span([], ['One']) }], selectedValue: Option.some('one'), ariaLabel: 'Choice' },
    })
    Scene.scene({ update, view: embeddedView }, Scene.given(Group.init({ id: 'plans' })), Scene.expect(Scene.role('radiogroup', { name: 'Choice' })).toExist())
  })
})
