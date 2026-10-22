import { brandViewResult } from 'foldkit/brand'
import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import * as Grid from './grid.js'
import { accentColors } from '../props/color.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'

const sizes = ['1', '2', '3'] as const
const variants = ['surface', 'classic'] as const
const columns = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const gaps = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
export const Props = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  size: Schema.optional(responsiveSchema(sizes)),
  variant: Schema.optional(Schema.Literals(variants)),
  color: Schema.optional(Schema.Literals(accentColors)),
  highContrast: Schema.optional(Schema.Boolean),
  columns: Schema.optional(responsiveSchema(columns, true)),
  gap: Schema.optional(responsiveSchema(gaps)),
  isDisabled: Schema.optional(Schema.Boolean),
})
export type Props = typeof Props.Type
export type Option<Value extends string> = { value: Value; label: ReadonlyArray<Html | string>; isDisabled?: boolean }
export const view = <Value extends string, Message>(props: Props & {
  options: ReadonlyArray<Option<Value>>
  selected: ReadonlySet<Value>
  toggleMessage(value: Value, isChecked: boolean): Message
}, h: HtmlBuilder<Message>): Html => {
  const sizeClasses = responsiveClasses(sizeProp, props.size ?? '2').classes
  const rootAttributes: Attribute<Message>[] = [
    h.Id(props.id), h.Role('group'), h.AriaLabelledBy(`${props.id}-label`),
    h.Class(['rt-CheckboxCardsRoot', ...sizeClasses, `rt-variant-${props.variant ?? 'surface'}`].join(' ')),
  ]
  if (props.color !== undefined) rootAttributes.push(h.DataAttribute('accent-color', props.color))
  const cards = props.options.map(option => {
    const isChecked = props.selected.has(option.value)
    return h.label([h.Class('rt-BaseCard rt-CheckboxCardsItem')], [
      h.input([
        h.Type('checkbox'),
        h.Checked(isChecked),
        h.AriaChecked(isChecked),
        h.Disabled(props.isDisabled === true || option.isDisabled === true),
        h.AriaDisabled(props.isDisabled === true || option.isDisabled === true),
        h.Class(['rt-reset', 'rt-BaseCheckboxRoot', 'rt-CheckboxCardCheckbox', ...sizeClasses, 'rt-variant-surface', ...(props.highContrast ? ['rt-high-contrast'] : [])].join(' ')),
        h.DataAttribute('state', isChecked ? 'checked' : 'unchecked'),
        h.OnChange(() => props.toggleMessage(option.value, !isChecked)),
      ]),
      ...option.label,
    ])
  })
  return brandViewResult(h.div(rootAttributes, [
    h.span([h.Id(`${props.id}-label`)], [props.label]),
    Grid.view({ columns: props.columns ?? 'repeat(auto-fit, minmax(200px, 1fr))', gap: props.gap ?? '4' }, cards, h),
  ]), 'wseffect/CheckboxCards')
}
