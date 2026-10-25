import { brandViewResult } from '@wsagency/wseffect-foldkit/brand'
import { Schema } from 'effect'
import type { Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { accentColors } from '../props/color.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'

const sizes = ['1', '2', '3'] as const
const variants = ['classic', 'surface', 'soft'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const variantClasses = Object.freeze({ classic: 'rt-variant-classic', surface: 'rt-variant-surface', soft: 'rt-variant-soft' })
export const Props = Schema.Struct({
  id: Schema.String,
  value: Schema.String,
  name: Schema.optional(Schema.String),
  checked: Schema.optional(Schema.Boolean),
  disabled: Schema.optional(Schema.Boolean),
  size: Schema.optional(responsiveSchema(sizes)),
  variant: Schema.optional(Schema.Literals(variants)),
  color: Schema.optional(Schema.Literals(accentColors)),
  highContrast: Schema.optional(Schema.Boolean),
  onValueChange: Schema.optional(Schema.declare((input): input is (value: string) => unknown => typeof input === 'function')),
})
export type Props = typeof Props.Type
export const view = <Message>(props: Props & { onValueChange?: (value: string) => Message }, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => brandViewResult(h.label([], [
  h.input([
    h.Id(props.id), h.Type('radio'), h.Value(props.value), ...(props.name === undefined ? [] : [h.Name(props.name)]),
    h.Checked(props.checked ?? false), h.Disabled(props.disabled ?? false), h.Role('radio'),
    h.AriaChecked(props.checked ?? false), h.AriaLabelledBy(`${props.id}-label`),
    h.Class(['rt-reset', 'rt-BaseRadioRoot', ...responsiveClasses(sizeProp, props.size ?? '2').classes, variantClasses[props.variant ?? 'surface'], ...(props.highContrast ? ['rt-high-contrast'] : [])].join(' ')),
    ...(props.color === undefined ? [] : [h.DataAttribute('accent-color', props.color)]),
    ...(props.onValueChange === undefined ? [] : [h.OnChange(() => props.onValueChange?.(props.value) as Message)]),
  ]),
  h.span([h.Id(`${props.id}-label`)], children),
]), 'wseffect/Radio')
