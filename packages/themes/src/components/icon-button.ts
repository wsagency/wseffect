import { brandViewResult } from 'foldkit/brand'
import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import * as ButtonUi from '@foldkit/ui/button'
import { accentColors } from '../props/color.props.js'
import { radii } from '../props/radius.props.js'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
const sizes = ['1', '2', '3', '4'] as const
const variants = ['classic', 'solid', 'soft', 'surface', 'outline', 'ghost-offset', 'ghost'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const variantClasses = Object.freeze({ classic: 'rt-variant-classic', solid: 'rt-variant-solid', soft: 'rt-variant-soft', surface: 'rt-variant-surface', outline: 'rt-variant-outline', 'ghost-offset': 'rt-variant-ghost-offset', ghost: 'rt-variant-ghost' })
const classes = Object.freeze(Object.fromEntries(sizes.flatMap(size => variants.flatMap(variant => [false, true].flatMap(highContrast => [false, true].map(loading => [`${size}:${variant}:${highContrast}:${loading}`, ['rt-reset', 'rt-BaseButton', `rt-r-size-${size}`, variantClasses[variant], 'rt-IconButton', ...(highContrast ? ['rt-high-contrast'] : []), ...(loading ? ['rt-loading'] : [])].join(' ')] as const))))))
export const Props = Schema.Struct({ size: Schema.optional(responsiveSchema(sizes)), variant: Schema.optional(Schema.Literals(variants)), color: Schema.optional(Schema.Literals(accentColors)), radius: Schema.optional(Schema.Literals(radii)), highContrast: Schema.optional(Schema.Boolean), disabled: Schema.optional(Schema.Boolean), loading: Schema.optional(Schema.Boolean), type: Schema.optional(Schema.Literals(['button', 'submit', 'reset'])), 'aria-label': Schema.optional(Schema.String), ...marginPropSchemas })
export type ViewProps<Message> = typeof Props.Type & Readonly<{ onClick?: Message }>
export const view = <Message>(props: ViewProps<Message>, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const size = props.size ?? '2'
  const variant = props.variant ?? 'solid'
  const margin = marginClasses(props)
  const responsive = typeof size !== 'string'
  const baseClass = responsive ? ['rt-reset', 'rt-BaseButton', ...responsiveClasses(sizeProp, size).classes, variantClasses[variant], 'rt-IconButton', ...(props.highContrast ? ['rt-high-contrast'] : []), ...(props.loading ? ['rt-loading'] : [])].join(' ') : classes[`${size}:${variant}:${props.highContrast === true}:${props.loading === true}` as keyof typeof classes]
  const attributes: Attribute<Message>[] = [h.Class([baseClass, ...margin.classes].join(' '))]
  if (props['aria-label'] !== undefined) attributes.push(h.AriaLabel(props['aria-label']))
  if (props.color !== undefined) attributes.push(h.DataAttribute('accent-color', props.color))
  if (props.radius !== undefined) attributes.push(h.DataAttribute('radius', props.radius))
  if (Object.keys(margin.style).length) attributes.push(h.Style(margin.style))
  const spinner = h.span([h.Class('rt-Spinner rt-r-size-2'), h.AriaHidden(true)], Array.from({ length: 8 }, () => h.span([h.Class('rt-SpinnerLeaf')], [])))
  return brandViewResult(ButtonUi.view({ onClick: props.onClick, isDisabled: props.disabled ?? props.loading, type: props.type, toView: ({ button }) => h.button([...button, ...attributes], [h.span([h.Class('rt-ButtonContent'), h.Style({ display: 'contents' })], children), ...(props.loading ? [spinner] : [])]) }, h), 'wseffect/IconButton')
}
