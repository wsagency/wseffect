import { brandViewResult } from 'foldkit/brand'
import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
const widthProp = responsiveProp({ className: 'rt-r-w', customProperties: ['--width'] })
const heightProp = responsiveProp({ className: 'rt-r-h', customProperties: ['--height'] })
export const Props = Schema.Struct({ loading: Schema.optional(Schema.Boolean), width: Schema.optional(responsiveSchema([], true)), height: Schema.optional(responsiveSchema([], true)), ...marginPropSchemas })
export type ViewProps = typeof Props.Type
export const view = <Message>(props: ViewProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  if (props.loading === false) return h.span([], children)
  const width = props.width === undefined ? undefined : responsiveClasses(widthProp, props.width)
  const height = props.height === undefined ? undefined : responsiveClasses(heightProp, props.height)
  const margin = marginClasses(props)
  const classes = ['rt-Skeleton', ...(width?.classes ?? []), ...(height?.classes ?? []), ...margin.classes]
  const style = { ...width?.style, ...height?.style, ...margin.style }
  const attrs: Attribute<Message>[] = [h.Class(classes.join(' ')), h.AriaHidden(true), h.Attribute('tabindex', '-1'), h.Attribute('inert', '')]
  if (Object.keys(style).length) attrs.push(h.Style(style))
  return brandViewResult(h.span(attrs, children), 'wseffect/Skeleton')
}
