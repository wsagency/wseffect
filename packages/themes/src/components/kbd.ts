import { brandViewResult } from '@wsagency/wseffect-foldkit/brand'
import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
const sizes = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const variants = ['classic', 'soft'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const variantClasses = Object.freeze({ classic: 'rt-variant-classic', soft: 'rt-variant-soft' })
export const Props = Schema.Struct({ size: Schema.optional(responsiveSchema(sizes)), variant: Schema.optional(Schema.Literals(variants)), ...marginPropSchemas })
export type ViewProps = typeof Props.Type
export const view = <Message>(props: ViewProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const size = responsiveClasses(sizeProp, props.size)
  const margin = marginClasses(props)
  const attrs: Attribute<Message>[] = [h.Class(['rt-reset', 'rt-Kbd', ...size.classes, variantClasses[props.variant ?? 'classic'], ...margin.classes].join(' '))]
  const style = { ...size.style, ...margin.style }
  if (Object.keys(style).length) attrs.push(h.Style(style))
  return brandViewResult(h.kbd(attrs, children), 'wseffect/Kbd')
}
