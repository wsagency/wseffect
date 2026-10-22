import { Option } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as RadioCards from '../src/components/radio-cards.js'
import { defineMessageUnion } from 'foldkit/message'
const Group = RadioCards.create<'free' | 'pro'>()
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: RadioCards.Model, _message: Message | RadioCards.Message) => ({ model })
const view = (model: RadioCards.Model, h: HtmlBuilder<Message | RadioCards.Message>) => Group.view(model, { options: [{ value: 'free', label: h.span([], ['Free']) }, { value: 'pro', label: h.span([], ['Pro']) }], selectedValue: Option.some('pro'), ariaLabel: 'Plan', props: { highContrast: true } }, h as HtmlBuilder<RadioCards.Message>)
describe('RadioCards', () => {
  it('retains radio semantics, pinned default columns, and high contrast on the card root', () => Scene.scene({ update, view }, Scene.given(Group.init({ id: 'plan' })), Scene.expect(Scene.role('radiogroup', { name: 'Plan' })).toExist(), Scene.expect(Scene.selector('.rt-RadioCardsRoot.rt-high-contrast')).toExist(), Scene.expect(Scene.selector('.rt-RadioCardsRoot')).toHaveStyle('--grid-template-columns', 'repeat(auto-fit, minmax(160px, 1fr))'), Scene.expect(Scene.selector('.rt-RadioCardsItem')).toExist(), Scene.expect(Scene.selector('[role="radio"][aria-checked="true"]')).toExist()))
})
