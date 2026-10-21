import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { brandViewResult } from 'foldkit/brand'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
import { layoutPropDefs } from '../props/layout.props.js'
const sizes = ['1', '2', '3', '4'] as const
const displays = ['none', 'initial'] as const
const aligns = ['left', 'center', 'right'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const displayProp = responsiveProp({ className: 'rt-r-display', values: displays, parseValue: value => value === 'initial' ? 'flex' : value })
const alignProp = responsiveProp({ className: 'rt-r-ai', values: aligns, parseValue: value => value === 'left' ? 'start' : value === 'right' ? 'end' : value })
const layoutProps = Object.fromEntries(Object.entries(layoutPropDefs).map(([key, value]) => [key, Schema.optional(responsiveSchema(value.values ?? [], value.values === undefined))]))
export const Props = Schema.Struct({ size: Schema.optional(responsiveSchema(sizes)), display: Schema.optional(responsiveSchema(displays)), align: Schema.optional(responsiveSchema(aligns)), ...layoutProps, ...marginPropSchemas })
export type ViewProps = typeof Props.Type
export const view = <Message>(props: ViewProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const size = responsiveClasses(sizeProp, props.size ?? '4')
  const display = responsiveClasses(displayProp, props.display)
  const align = responsiveClasses(alignProp, props.align)
  const margin = marginClasses(props)
  const outerClass = ['rt-Container', ...size.classes, ...display.classes, ...align.classes, ...margin.classes].join(' ')
  const outerStyle = { ...size.style, ...display.style, ...align.style, ...margin.style }
  const innerAttributes = [h.Class('rt-ContainerInner')]
  return brandViewResult(h.div([h.Class(outerClass), ...(Object.keys(outerStyle).length ? [h.Style(outerStyle)] : [])], [h.div(innerAttributes, children)]), 'wseffect/Container')
}
