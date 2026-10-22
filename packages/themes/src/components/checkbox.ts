import { brandViewResult } from 'foldkit/brand'
import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as CheckboxUi from '@foldkit/ui/checkbox'
import { accentColors } from '../props/color.props.js'
import { radii } from '../props/radius.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import { thickCheckIcon, thickDividerIcon } from './icons.js'

const sizes = ['1', '2', '3'] as const
const variants = ['classic', 'surface', 'soft'] as const
const variantClasses = Object.freeze({ classic: 'rt-variant-classic', surface: 'rt-variant-surface', soft: 'rt-variant-soft' })
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
export const Props = Schema.Struct({
  id: Schema.String,
  size: Schema.optional(responsiveSchema(sizes)),
  variant: Schema.optional(Schema.Literals(variants)),
  color: Schema.optional(Schema.Literals(accentColors)),
  radius: Schema.optional(Schema.Literals(radii)),
  highContrast: Schema.optional(Schema.Boolean),
  checked: Schema.optional(Schema.Boolean),
  defaultChecked: Schema.optional(Schema.Boolean),
  indeterminate: Schema.optional(Schema.Boolean),
  disabled: Schema.optional(Schema.Boolean),
  readOnly: Schema.optional(Schema.Boolean),
  name: Schema.optional(Schema.String),
  value: Schema.optional(Schema.String),
  ariaLabel: Schema.optional(Schema.String),
  onCheckedChange: Schema.declare((input): input is (checked: boolean) => unknown => typeof input === 'function'),
})
export type Props = typeof Props.Type
export const view = <Message>(props: Omit<Props, 'onCheckedChange'> & { onCheckedChange: (checked: boolean) => Message }, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const size = props.size ?? '2'
  const classes = [
    'rt-reset', 'rt-BaseCheckboxRoot', 'rt-CheckboxRoot',
    ...(typeof size === 'string' ? [`rt-r-size-${size}`] : responsiveClasses(sizeProp, size).classes),
    variantClasses[props.variant ?? 'surface'], ...(props.highContrast ? ['rt-high-contrast'] : []),
  ].join(' ')
  const isChecked = props.checked ?? props.defaultChecked ?? false
  return brandViewResult(CheckboxUi.view<Message>({
    id: props.id, isChecked,
    isIndeterminate: props.indeterminate, isDisabled: props.disabled, isReadOnly: props.readOnly,
    name: props.name, value: props.value,
    onToggle: checked => props.onCheckedChange(checked),
    toView: attributes => {
      const attrs = [...(props.ariaLabel === undefined ? attributes.checkbox : attributes.checkbox.filter(attribute => attribute._tag !== 'AriaLabelledBy')), h.DataAttribute('state', props.indeterminate ? 'indeterminate' : isChecked ? 'checked' : 'unchecked'), h.Class(classes)]
      if (props.ariaLabel !== undefined) attrs.push(h.AriaLabel(props.ariaLabel))
      if (props.color !== undefined) attrs.push(h.DataAttribute('accent-color', props.color))
      const indicator = props.indeterminate ? thickDividerIcon(h) : isChecked ? thickCheckIcon(h) : null
      return h.label([...attributes.label], [
        h.button(attrs, indicator === null ? [] : [h.span([h.Class('rt-BaseCheckboxIndicator'), h.AriaHidden(true)], [indicator])]),
        h.span([h.Id(`${props.id}-label`)], children),
        ...(attributes.hiddenInput.length > 0 ? [h.input([...attributes.hiddenInput])] : []),
      ])
    },
  }, h), 'wseffect/Checkbox')
}
