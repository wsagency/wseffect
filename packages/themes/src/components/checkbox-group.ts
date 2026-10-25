import { brandViewResult } from '@wsagency/wseffect-foldkit/brand'
import { Schema } from 'effect'
import type { Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as UiCheckboxGroup from '@wsagency/wseffect-foldkit-ui/checkboxGroup'
import { accentColors } from '../props/color.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import { thickCheckIcon } from './icons.js'

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
  ariaLabel: Schema.optional(Schema.String),
})
export type Props = typeof Props.Type
export type Option<Value extends string> = { value: Value; label: Html; isDisabled?: boolean }
export const view = <Value extends string, Message>(props: Props & {
  label?: Html
  ariaLabel?: string
  options: ReadonlyArray<Option<Value>>
  selected: ReadonlySet<Value>
  toggleMessage(value: Value, isChecked: boolean): Message
}, h: HtmlBuilder<Message>): Html => {
  const sizeClasses = responsiveClasses(sizeProp, props.size ?? '2').classes
  return brandViewResult(UiCheckboxGroup.view({
    id: props.id,
    label: props.label,
    ariaLabel: props.ariaLabel,
    options: props.options,
    selected: props.selected,
    isDisabled: props.isDisabled,
    toggleMessage: props.toggleMessage,
    toView: ({ rootAttributes, options }) => h.div([
      ...rootAttributes,
      ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
      h.Class('rt-CheckboxGroupRoot'),
    ], [
      ...(props.label === undefined ? [] : [h.span([h.Id(`${props.id}-label`)], [props.label])]),
      ...options.map(({ option, checkbox }, index) => {
        const isChecked = props.selected.has(option.value)
        const isDisabled = props.isDisabled === true || option.isDisabled === true
        const labelId = `${props.id}-option-${index}-label`
        return h.label([h.Class(['rt-CheckboxGroupItem', 'rt-Text', ...sizeClasses].join(' '))], [
          h.button([
            ...checkbox.checkbox,
            h.AriaLabelledBy(labelId),
            h.Disabled(isDisabled),
            ...(props.color === undefined ? [] : [h.DataAttribute('accent-color', props.color)]),
            h.Class(['rt-reset', 'rt-BaseCheckboxRoot', 'rt-CheckboxGroupItemCheckbox', ...sizeClasses, `rt-variant-${props.variant ?? 'surface'}`, ...(props.highContrast ? ['rt-high-contrast'] : [])].join(' ')),
            h.DataAttribute('state', isChecked ? 'checked' : 'unchecked'),
          ], isChecked ? [h.span([h.Class('rt-BaseCheckboxIndicator'), h.AriaHidden(true)], [thickCheckIcon(h)])] : []),
          h.span([h.Id(labelId), h.Class('rt-CheckboxGroupItemInner')], [option.label]),
        ])
      }),
    ]),
  }, h), 'wseffect/CheckboxGroup')
}
