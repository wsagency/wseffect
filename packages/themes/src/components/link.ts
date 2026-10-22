import { brandViewResult } from 'foldkit/brand'
import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { accentColors } from '../props/color.props.js'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
const sizes = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const weights = ['light', 'regular', 'medium', 'bold'] as const
const trims = ['normal', 'start', 'end', 'both'] as const
const wraps = ['wrap', 'nowrap', 'pretty', 'balance'] as const
const underlines = ['auto', 'always', 'hover', 'none'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const weightProp = responsiveProp({ className: 'rt-r-weight', values: weights })
const trimProp = responsiveProp({ className: 'rt-r-lt', values: trims })
const wrapProp = responsiveProp({ className: 'rt-r-tw', values: wraps })
const underlineClasses = Object.freeze({ auto: 'rt-underline-auto', always: 'rt-underline-always', hover: 'rt-underline-hover', none: 'rt-underline-none' })
export const Props = Schema.Struct({ href: Schema.optional(Schema.String), target: Schema.optional(Schema.String), rel: Schema.optional(Schema.String), download: Schema.optional(Schema.Union([Schema.String, Schema.Boolean])), size: Schema.optional(responsiveSchema(sizes)), weight: Schema.optional(responsiveSchema(weights)), trim: Schema.optional(responsiveSchema(trims)), truncate: Schema.optional(Schema.Boolean), wrap: Schema.optional(responsiveSchema(wraps)), underline: Schema.optional(Schema.Literals(underlines)), color: Schema.optional(Schema.Literals(accentColors)), highContrast: Schema.optional(Schema.Boolean), ...marginPropSchemas })
export type ViewProps = typeof Props.Type
export const view = <Message>(props: ViewProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const size = responsiveClasses(sizeProp, props.size)
  const weight = responsiveClasses(weightProp, props.weight)
  const trim = responsiveClasses(trimProp, props.trim)
  const wrap = responsiveClasses(wrapProp, props.wrap)
  const margin = marginClasses(props)
  const underline = props.underline ?? 'auto'
  const attrs: Attribute<Message>[] = [h.Class(['rt-Text', 'rt-reset', 'rt-Link', ...size.classes, ...weight.classes, ...trim.classes, ...wrap.classes, underlineClasses[underline], ...(props.truncate ? ['rt-truncate'] : []), ...(props.highContrast ? ['rt-high-contrast'] : []), ...margin.classes].join(' '))]
  if (props.href !== undefined) attrs.push(h.Attribute('href', props.href))
  if (props.target !== undefined) attrs.push(h.Attribute('target', props.target))
  if (props.rel !== undefined) attrs.push(h.Attribute('rel', props.rel))
  if (props.download === true) attrs.push(h.Attribute('download', ''))
  else if (typeof props.download === 'string') attrs.push(h.Attribute('download', props.download))
  if (props.color !== undefined) attrs.push(h.DataAttribute('accent-color', props.color))
  const style = { ...size.style, ...weight.style, ...trim.style, ...wrap.style, ...margin.style }
  if (Object.keys(style).length) attrs.push(h.Style(style))
  return brandViewResult(h.a(attrs, children), 'wseffect/Link')
}
