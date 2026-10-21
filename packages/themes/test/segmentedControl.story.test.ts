import { Option } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { defineMessageUnion } from 'foldkit/message'
import { describe, it } from 'vitest'
import * as SegmentedControl from '../src/components/segmented-control.js'
const Group = SegmentedControl.create<'day' | 'week' | 'month'>()
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: SegmentedControl.Model, message: SegmentedControl.Message | Message) => message._tag === 'Tick' ? { model } : Group.update(model, message)
const view = (model: SegmentedControl.Model, h: HtmlBuilder<SegmentedControl.Message | Message>) => Group.view(model, { options: [{ value: 'day', label: h.span([], ['Day']) }, { value: 'week', label: h.span([], ['Week']) }, { value: 'month', label: h.span([], ['Month']) }], selectedValue: Option.some('day'), ariaLabel: 'Range', orientation: 'Horizontal' }, h as HtmlBuilder<SegmentedControl.Message>)
describe('SegmentedControl', () => {
  it('arrow key selects one option', () => Scene.scene({ update, view }, Scene.given(Group.init({ id: 'range' })), Scene.keydown(Scene.selector('[role="radio"]'), 'ArrowRight'), Scene.Command.resolve(SegmentedControl.FocusOption, SegmentedControl.Message.CompletedFocusOption()), Scene.expect(Scene.selector('[role="radio"][aria-checked="true"]')).toExist()))
})
