import { brandViewResult } from 'foldkit/brand'
import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { accentColors } from '../props/color.props.js'
import { radii } from '../props/radius.props.js'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
const sizes = ['1', '2', '3'] as const
const variants = ['solid', 'soft', 'surface', 'outline'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const variantClasses = Object.freeze({ solid: 'rt-variant-solid', soft: 'rt-variant-soft', surface: 'rt-variant-surface', outline: 'rt-variant-outline' })
export const Props = Schema.Struct({ role: Schema.optional(Schema.String), size: Schema.optional(responsiveSchema(sizes)), variant: Schema.optional(Schema.Literals(variants)), color: Schema.optional(Schema.Literals(accentColors)), highContrast: Schema.optional(Schema.Boolean), radius: Schema.optional(Schema.Literals(radii)), ...marginPropSchemas })
export type ViewProps = typeof Props.Type
export const view = <Message>(props: ViewProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const size = responsiveClasses(sizeProp, props.size ?? '1')
  const margin = marginClasses(props)
  const attrs: Attribute<Message>[] = [h.Class(['rt-Badge', ...size.classes, variantClasses[props.variant ?? 'soft'], ...margin.classes].join(' '))]
  if (props.role !== undefined) attrs.push(h.Role(props.role))
  if (props.color !== undefined) attrs.push(h.DataAttribute('accent-color', props.color))
  if (props.radius !== undefined) attrs.push(h.DataAttribute('radius', props.radius))
  const style = { ...size.style, ...margin.style }
  if (Object.keys(style).length) attrs.push(h.Style(style))
  return brandViewResult(h.span(attrs, children), 'wseffect/Badge')
}
