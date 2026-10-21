import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as RadioGroupUi from '@foldkit/ui/radioGroup'
import * as RadioGroup from './radio-group.js'
import { accentColors } from '../props/color.props.js'
import { responsiveSchema } from '../props/componentSchema.js'

const sizes = ['1', '2', '3'] as const
const variants = ['classic', 'surface', 'soft'] as const
export const Props = Schema.Struct({
  size: Schema.optional(responsiveSchema(sizes)),
  variant: Schema.optional(Schema.Literals(variants)),
  color: Schema.optional(Schema.Literals(accentColors)),
  highContrast: Schema.optional(Schema.Boolean),
})
export type Props = typeof Props.Type
export type Model = RadioGroup.Model
export const Message = RadioGroupUi.Message
export type Message = typeof Message.Type
export type OutMessage<Value extends string> = RadioGroup.OutMessage<Value>
export const FocusOption = RadioGroupUi.FocusOption
export type ViewInputs<Value extends string> = RadioGroup.ViewInputs<Value> & Readonly<{ props?: Props }>
export type Bundle<Value extends string> = Omit<RadioGroup.Bundle<Value>, 'view'> & Readonly<{ view(model: Model, inputs: ViewInputs<Value>, h: HtmlBuilder<Message>): Html }>
export const create = <Value extends string>(): Bundle<Value> => {
  const group = RadioGroup.create<Value>()
  const view = (model: Model, inputs: ViewInputs<Value>, h: HtmlBuilder<Message>): Html => group.view(model, {
    ...inputs,
    props: { ...inputs.props, rootClass: 'rt-SegmentedControlRoot' },
  }, h)
  return { ...group, view }
}
