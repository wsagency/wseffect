import { brandViewResult } from 'foldkit/brand'
import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as CheckboxGroupPrimitive from '@wsagency/wseffect-primitives/checkbox-group'
import { accentColors } from '../props/color.props.js'
import { responsiveSchema } from '../props/componentSchema.js'

const sizes = ['1', '2', '3'] as const
const variants = ['classic', 'surface', 'soft'] as const
export const Props = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  size: Schema.optional(responsiveSchema(sizes)),
  variant: Schema.optional(Schema.Literals(variants)),
  color: Schema.optional(Schema.Literals(accentColors)),
  highContrast: Schema.optional(Schema.Boolean),
  isDisabled: Schema.optional(Schema.Boolean),
})
export type Props = typeof Props.Type
export type Option<Value extends string> = { value: Value; label: Html; isDisabled?: boolean }
export const view = <Value extends string, Message>(props: Props & {
  options: ReadonlyArray<Option<Value>>
  selected: ReadonlySet<Value>
  toggleMessage(value: Value, isChecked: boolean): Message
}, h: HtmlBuilder<Message>): Html => brandViewResult(CheckboxGroupPrimitive.view({
  id: props.id,
  label: h.span([], [props.label]),
  options: props.options.map(option => ({ value: option.value, label: option.label, isDisabled: option.isDisabled ?? false })),
  selected: props.selected,
  isDisabled: props.isDisabled,
  toggleMessage: props.toggleMessage,
}, h), 'wseffect/CheckboxGroup')
