import { brandViewResult } from 'foldkit/brand'
import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { accentColors } from '../props/color.props.js'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
const sizes = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const weights = ['light', 'regular', 'medium', 'bold'] as const
const wraps = ['wrap', 'nowrap', 'pretty', 'balance'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const weightProp = responsiveProp({ className: 'rt-r-weight', values: weights })
const wrapProp = responsiveProp({ className: 'rt-r-tw', values: wraps })
export const Props = Schema.Struct({ size: Schema.optional(responsiveSchema(sizes)), weight: Schema.optional(responsiveSchema(weights)), color: Schema.optional(Schema.Literals(accentColors)), highContrast: Schema.optional(Schema.Boolean), truncate: Schema.optional(Schema.Boolean), wrap: Schema.optional(responsiveSchema(wraps)), ...marginPropSchemas })
export type ViewProps = typeof Props.Type
export const view = <Message>(props: ViewProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const size = responsiveClasses(sizeProp, props.size)
  const weight = responsiveClasses(weightProp, props.weight)
  const wrap = responsiveClasses(wrapProp, props.wrap)
  const margin = marginClasses(props)
  const attrs: Attribute<Message>[] = [h.Class(['rt-Text', 'rt-Blockquote', ...size.classes, ...weight.classes, ...wrap.classes, ...(props.truncate ? ['rt-truncate'] : []), ...margin.classes, ...(props.highContrast ? ['rt-high-contrast'] : [])].join(' '))]
  if (props.color !== undefined) attrs.push(h.DataAttribute('accent-color', props.color))
  const style = { ...size.style, ...weight.style, ...wrap.style, ...margin.style }
  if (Object.keys(style).length) attrs.push(h.Style(style))
  return brandViewResult(h.blockquote(attrs, children), 'wseffect/Blockquote')
}
