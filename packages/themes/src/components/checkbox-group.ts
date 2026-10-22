import { brandViewResult } from 'foldkit/brand'
import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { accentColors } from '../props/color.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'

const sizes = ['1', '2', '3'] as const
const variants = ['classic', 'surface', 'soft'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
export const Props = Schema.Struct({
  id: Schema.String,
  size: Schema.optional(responsiveSchema(sizes)),
  variant: Schema.optional(Schema.Literals(variants)),
  color: Schema.optional(Schema.Literals(accentColors)),
  highContrast: Schema.optional(Schema.Boolean),
  isDisabled: Schema.optional(Schema.Boolean),
})
export type Props = typeof Props.Type
export type Option<Value extends string> = { value: Value; label: Html; isDisabled?: boolean }
export const view = <Value extends string, Message>(props: Props & {
  label: Html
  options: ReadonlyArray<Option<Value>>
  selected: ReadonlySet<Value>
  toggleMessage(value: Value, isChecked: boolean): Message
}, h: HtmlBuilder<Message>): Html => {
  const sizeClasses = responsiveClasses(sizeProp, props.size ?? '2').classes
  const rootAttributes: Attribute<Message>[] = [
    h.Id(props.id), h.Role('group'), h.AriaLabelledBy(`${props.id}-label`),
    h.Class(['rt-CheckboxGroupRoot', ...sizeClasses, `rt-variant-${props.variant ?? 'surface'}`].join(' ')),
  ]
  if (props.color !== undefined) rootAttributes.push(h.DataAttribute('accent-color', props.color))
  return brandViewResult(h.div(rootAttributes, [
    h.span([h.Id(`${props.id}-label`)], [props.label]),
    ...props.options.map(option => {
      const isChecked = props.selected.has(option.value)
      const isDisabled = props.isDisabled === true || option.isDisabled === true
      return h.label([h.Class('rt-CheckboxGroupItem')], [
        h.input([
          h.Type('checkbox'),
          h.Checked(isChecked),
          h.AriaChecked(isChecked),
          h.Disabled(isDisabled),
          h.AriaDisabled(isDisabled),
          h.Class(['rt-reset', 'rt-BaseCheckboxRoot', 'rt-CheckboxGroupItemCheckbox', ...sizeClasses, `rt-variant-${props.variant ?? 'surface'}`, ...(props.highContrast ? ['rt-high-contrast'] : [])].join(' ')),
          h.DataAttribute('state', isChecked ? 'checked' : 'unchecked'),
          h.OnChange(() => props.toggleMessage(option.value, !isChecked)),
        ]),
        h.span([h.Class('rt-CheckboxGroupItemInner')], [option.label]),
      ])
    }),
  ]), 'wseffect/CheckboxGroup')
}
