import { brandViewResult } from '@wsagency/wseffect-foldkit/brand'
import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { accentColors } from '../props/color.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import { thickCheckIcon } from './icons.js'

const sizes = ['1', '2', '3'] as const
const variants = ['surface', 'classic'] as const
const columns = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const gaps = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const columnsProp = responsiveProp({ className: 'rt-r-gtc', values: columns, customProperties: ['--grid-template-columns'], parseValue: value => /^\d+$/.test(value) ? `repeat(${value}, minmax(0, 1fr))` : value })
const gapProp = responsiveProp({ className: 'rt-r-gap', values: gaps, customProperties: ['--gap'] })
export const Props = Schema.Struct({
  id: Schema.String,
  label: Schema.optional(Schema.String),
  ariaLabel: Schema.optional(Schema.String),
  size: Schema.optional(responsiveSchema(sizes)),
  variant: Schema.optional(Schema.Literals(variants)),
  color: Schema.optional(Schema.Literals(accentColors)),
  highContrast: Schema.optional(Schema.Boolean),
  columns: Schema.optional(responsiveSchema(columns, true)),
  gap: Schema.optional(responsiveSchema(gaps, true)),
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
  const columns = responsiveClasses(columnsProp, props.columns ?? 'repeat(auto-fit, minmax(200px, 1fr))')
  const gap = responsiveClasses(gapProp, props.gap ?? '4')
  const rootAttributes: Attribute<Message>[] = [
    h.Id(props.id), h.Role('group'),
    ...(props.ariaLabel === undefined ? [h.AriaLabelledBy(`${props.id}-label`)] : [h.AriaLabel(props.ariaLabel)]),
    h.Class(['rt-Grid', 'rt-CheckboxCardsRoot', ...sizeClasses, ...columns.classes, ...gap.classes, `rt-variant-${props.variant ?? 'surface'}`, ...(props.highContrast ? ['rt-high-contrast'] : [])].join(' ')),
    ...(Object.keys({ ...columns.style, ...gap.style }).length === 0 ? [] : [h.Style({ ...columns.style, ...gap.style })]),
  ]
  if (props.color !== undefined) rootAttributes.push(h.DataAttribute('accent-color', props.color))
  const cards = props.options.map((option, index) => {
    const isChecked = props.selected.has(option.value)
    const isDisabled = props.isDisabled === true || option.isDisabled === true
    const labelId = `${props.id}-option-${index}-label`
    return h.label([h.Class('rt-BaseCard rt-CheckboxCardsItem')], [
      h.span([h.Id(labelId)], option.label),
      h.button([
        h.Type('button'),
        h.Role('checkbox'),
        h.AriaChecked(isChecked),
        h.AriaLabelledBy(labelId),
        h.Disabled(isDisabled),
        h.AriaDisabled(isDisabled),
        h.Class(['rt-reset', 'rt-BaseCheckboxRoot', 'rt-CheckboxCardCheckbox', ...sizeClasses, 'rt-variant-surface', ...(props.highContrast ? ['rt-high-contrast'] : [])].join(' ')),
        h.DataAttribute('state', isChecked ? 'checked' : 'unchecked'),
        ...(!isDisabled ? [h.OnClick(props.toggleMessage(option.value, !isChecked))] : []),
      ], isChecked ? [h.span([h.Class('rt-BaseCheckboxIndicator'), h.AriaHidden(true)], [thickCheckIcon(h)])] : []),
    ])
  })
  return brandViewResult(h.div(rootAttributes, [
    ...(props.label === undefined ? [] : [h.span([h.Id(`${props.id}-label`)], [props.label])]),
    ...cards,
  ]), 'wseffect/CheckboxCards')
}
