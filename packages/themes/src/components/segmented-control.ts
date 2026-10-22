import { brandViewResult } from 'foldkit/brand'
import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as RadioGroupUi from '@foldkit/ui/radioGroup'
import * as RadioGroup from './radio-group.js'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { radii } from '../props/radius.props.js'

const sizes = ['1', '2', '3'] as const
const variants = ['classic', 'surface'] as const
export const Props = Schema.Struct({
  size: Schema.optional(responsiveSchema(sizes)),
  variant: Schema.optional(Schema.Literals(variants)),
  disabled: Schema.optional(Schema.Boolean),
  radius: Schema.optional(Schema.Literals(radii)),
  ...marginPropSchemas,
})
export type Props = typeof Props.Type
export type Model = RadioGroup.Model
export const Message = RadioGroupUi.Message
export type Message = typeof Message.Type
export type OutMessage<Value extends string> = RadioGroup.OutMessage<Value>
export const FocusOption = RadioGroupUi.FocusOption
export type ViewInputs<Value extends string> = Omit<RadioGroup.ViewInputs<Value>, 'props'> & Readonly<{ props?: Props }>
export type Bundle<Value extends string> = Omit<RadioGroup.Bundle<Value>, 'view'> & Readonly<{ view(model: Model, inputs: ViewInputs<Value>, h: HtmlBuilder<Message>): Html }>
export const create = <Value extends string>(): Bundle<Value> => {
  const group = RadioGroup.create<Value>()
  const view = (model: Model, inputs: ViewInputs<Value>, h: HtmlBuilder<Message>): Html => {
    const props = inputs.props ?? {}
    const margin = marginClasses(props)
    return brandViewResult(group.view(model, {
      ...inputs,
      isDisabled: props.disabled ?? inputs.isDisabled,
      props: {
        ...props,
        segmented: true,
        rootRadius: props.radius,
        rootClass: ['rt-SegmentedControlRoot', ...margin.classes].join(' '),
        rootStyle: margin.style,
      },
    }, h), 'wseffect/SegmentedControl')
  }
  return { ...group, view }
}
