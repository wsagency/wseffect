import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { brandViewResult } from 'foldkit/brand'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
const sizes = ['1', '2', '3', '4'] as const
const displays = ['none', 'initial'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const displayProp = responsiveProp({ className: 'rt-r-display', values: displays, parseValue: value => value === 'initial' ? 'block' : value })
export const Props = Schema.Struct({ size: Schema.optional(responsiveSchema(sizes)), display: Schema.optional(responsiveSchema(displays)), ...marginPropSchemas })
export type ViewProps = typeof Props.Type
export const view = <Message>(props: ViewProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const size = responsiveClasses(sizeProp, props.size ?? '3')
  const display = responsiveClasses(displayProp, props.display)
  const margin = marginClasses(props)
  const attributes: Attribute<Message>[] = [h.Class(['rt-Section', ...size.classes, ...display.classes, ...margin.classes].join(' '))]
  const style = { ...size.style, ...display.style, ...margin.style }
  if (Object.keys(style).length) attributes.push(h.Style(style))
  return brandViewResult(h.section(attributes, children), 'wseffect/Section')
}
