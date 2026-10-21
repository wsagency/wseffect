import { brandViewResult } from 'foldkit/brand'
import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as CheckboxGroupPrimitive from '@wsagency/wseffect-primitives/checkbox-group'
import { accentColors } from '../props/color.props.js'
import { responsiveSchema } from '../props/componentSchema.js'

const sizes = ['1', '2', '3'] as const
const variants = ['surface', 'classic'] as const
const columns = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const gaps = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
export const Props = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  size: Schema.optional(responsiveSchema(sizes)),
  variant: Schema.optional(Schema.Literals(variants)),
  color: Schema.optional(Schema.Literals(accentColors)),
  highContrast: Schema.optional(Schema.Boolean),
  columns: Schema.optional(Schema.Literals(columns)),
  gap: Schema.optional(Schema.Literals(gaps)),
  isDisabled: Schema.optional(Schema.Boolean),
})
export type Props = typeof Props.Type
export type Option<Value extends string> = { value: Value; label: ReadonlyArray<Html | string>; isDisabled?: boolean }
export const view = <Value extends string, Message>(props: Props & {
  options: ReadonlyArray<Option<Value>>
  selected: ReadonlySet<Value>
  toggleMessage(value: Value, isChecked: boolean): Message
}, h: HtmlBuilder<Message>): Html => {
  const groupOptions = props.options.map(option => ({
    value: option.value,
    isDisabled: option.isDisabled ?? false,
    label: h.div([h.Class('rt-CheckboxCardsItemInner')], [
      h.span([h.Class('rt-CheckboxCardsItemLabel')], option.label),
    ]),
  }))
  return brandViewResult(h.div([
    h.Id(props.id), h.Role('group'), h.AriaLabelledBy(`${props.id}-label`),
    h.Class(['rt-CheckboxCardsRoot', `rt-r-size-${props.size ?? '2'}`, `rt-variant-${props.variant ?? 'surface'}`].join(' ')),
  ], [
    h.span([h.Id(`${props.id}-label`), h.Class('rt-CheckboxCardsLabel')], [props.label]),
    CheckboxGroupPrimitive.view({
      id: `${props.id}-options`,
      label: h.span([], []),
      selected: props.selected,
      options: groupOptions,
      isDisabled: props.isDisabled,
      toggleMessage: props.toggleMessage,
    }, h),
  ]), 'wseffect/CheckboxCards')
}
