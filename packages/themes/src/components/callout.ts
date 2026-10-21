import { brandViewResult } from 'foldkit/brand'
import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { accentColors } from '../props/color.props.js'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
const sizes = ['1', '2', '3'] as const
const variants = ['soft', 'surface', 'outline'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const variantClasses = Object.freeze({ soft: 'rt-variant-soft', surface: 'rt-variant-surface', outline: 'rt-variant-outline' })
const rootProps = Schema.Struct({ size: Schema.optional(responsiveSchema(sizes)), variant: Schema.optional(Schema.Literals(variants)), color: Schema.optional(Schema.Literals(accentColors)), highContrast: Schema.optional(Schema.Boolean), ...marginPropSchemas })
const iconProps = Schema.Struct({})
const textProps = Schema.Struct({ size: Schema.optional(responsiveSchema(sizes)), color: Schema.optional(Schema.Literals(accentColors)), ...marginPropSchemas })
export type RootProps = typeof rootProps.Type
export type IconProps = typeof iconProps.Type
export type TextProps = typeof textProps.Type
const rootView = <Message>(props: RootProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const size = responsiveClasses(sizeProp, props.size ?? '2')
  const margin = marginClasses(props)
  const attrs: Attribute<Message>[] = [h.Class(['rt-CalloutRoot', ...size.classes, variantClasses[props.variant ?? 'soft'], ...(props.highContrast ? ['rt-high-contrast'] : []), ...margin.classes].join(' '))]
  if (props.color !== undefined) attrs.push(h.DataAttribute('accent-color', props.color))
  const style = { ...size.style, ...margin.style }
  if (Object.keys(style).length) attrs.push(h.Style(style))
  return brandViewResult(h.div(attrs, children), 'wseffect/Callout.Root')
}
const iconView = <Message>(_props: IconProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => brandViewResult(h.div([h.Class('rt-CalloutIcon')], children), 'wseffect/Callout.Icon')
const textView = <Message>(props: TextProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const size = responsiveClasses(sizeProp, props.size ?? '2')
  const margin = marginClasses(props)
  const attrs: Attribute<Message>[] = [h.Class(['rt-CalloutText', ...size.classes, ...margin.classes].join(' '))]
  if (props.color !== undefined) attrs.push(h.DataAttribute('accent-color', props.color))
  const style = { ...size.style, ...margin.style }
  if (Object.keys(style).length) attrs.push(h.Style(style))
  return brandViewResult(h.p(attrs, children), 'wseffect/Callout.Text')
}
export const Root = Object.freeze({ Props: rootProps, view: rootView })
export const Icon = Object.freeze({ Props: iconProps, view: iconView })
export const Text = Object.freeze({ Props: textProps, view: textView })
