import { brandViewResult } from '@wsagency/wseffect-foldkit/brand'
import { Option, Schema } from 'effect'
import type { Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as SwitchUi from '@wsagency/wseffect-foldkit-ui/switch'
import { accentColors } from '../props/color.props.js'
import { radii } from '../props/radius.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'

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
  disabled: Schema.optional(Schema.Boolean),
  readOnly: Schema.optional(Schema.Boolean),
  name: Schema.optional(Schema.String),
  value: Schema.optional(Schema.String),
  ariaLabel: Schema.optional(Schema.String),
  onCheckedChange: Schema.optional(Schema.declare((input): input is (checked: boolean) => unknown => typeof input === 'function')),
})
export type Props = typeof Props.Type
export const view = <Message>(props: Props & { onCheckedChange?: (checked: boolean) => Message }, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const isChecked = props.checked ?? props.defaultChecked ?? false
  return brandViewResult(SwitchUi.view({
  id: props.id,
  isChecked,
  isDisabled: props.disabled,
  isReadOnly: props.readOnly,
  name: props.name,
  value: props.value,
  onToggle: checked => props.onCheckedChange?.(checked) as Message,
  toView: attributes => h.div([], [
    h.button([
      ...attributes.button.filter(attribute => props.ariaLabel === undefined || attribute._tag !== 'AriaLabelledBy'),
      ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
      h.DataAttribute('state', isChecked ? 'checked' : 'unchecked'),
      h.Class(['rt-reset', 'rt-SwitchRoot', ...(props.size === undefined || typeof props.size === 'string' ? [`rt-r-size-${props.size ?? '2'}`] : responsiveClasses(sizeProp, props.size).classes), variantClasses[props.variant ?? 'surface'], ...(props.highContrast ? ['rt-high-contrast'] : [])].join(' ')),
      ...(props.color === undefined ? [] : [h.DataAttribute('accent-color', props.color)]),
      ...(props.radius === undefined ? [] : [h.DataAttribute('radius', props.radius)]),
      ...(props.onCheckedChange === undefined ? [] : [h.OnKeyDownPreventDefault(key => props.readOnly === true ? Option.none() : key === ' ' || key === 'Enter' ? Option.some(props.onCheckedChange?.(!isChecked) as Message) : Option.none())]),
    ], [h.span([h.Class('rt-SwitchThumb'), h.AriaHidden(true), h.DataAttribute('state', isChecked ? 'checked' : 'unchecked')], [])]),
    h.label([...attributes.label], children),
    ...(attributes.hiddenInput.length === 0 ? [] : [h.input([...attributes.hiddenInput])]),
  ]),
}, h), 'wseffect/Switch')
}
