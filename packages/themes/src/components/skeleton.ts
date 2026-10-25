import { brandViewResult } from '@wsagency/wseffect-foldkit/brand'
import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
const dimensionProps = Object.freeze({
  width: responsiveProp({ className: 'rt-r-w', customProperties: ['--width'] }),
  minWidth: responsiveProp({ className: 'rt-r-min-w', customProperties: ['--min-width'] }),
  maxWidth: responsiveProp({ className: 'rt-r-max-w', customProperties: ['--max-width'] }),
  height: responsiveProp({ className: 'rt-r-h', customProperties: ['--height'] }),
  minHeight: responsiveProp({ className: 'rt-r-min-h', customProperties: ['--min-height'] }),
  maxHeight: responsiveProp({ className: 'rt-r-max-h', customProperties: ['--max-height'] }),
})
export const Props = Schema.Struct({
  loading: Schema.optional(Schema.Boolean),
  width: Schema.optional(responsiveSchema([], true)),
  minWidth: Schema.optional(responsiveSchema([], true)),
  maxWidth: Schema.optional(responsiveSchema([], true)),
  height: Schema.optional(responsiveSchema([], true)),
  minHeight: Schema.optional(responsiveSchema([], true)),
  maxHeight: Schema.optional(responsiveSchema([], true)),
  ...marginPropSchemas,
})
export type ViewProps = typeof Props.Type
export const view = <Message>(props: ViewProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  if (props.loading === false) {
    if (children.length === 0) return h.empty
    if (children.length === 1) return children[0] as Html
    return h.div([], children)
  }
  const dimensions = [
    responsiveClasses(dimensionProps.width, props.width),
    responsiveClasses(dimensionProps.minWidth, props.minWidth),
    responsiveClasses(dimensionProps.maxWidth, props.maxWidth),
    responsiveClasses(dimensionProps.height, props.height),
    responsiveClasses(dimensionProps.minHeight, props.minHeight),
    responsiveClasses(dimensionProps.maxHeight, props.maxHeight),
  ]
  const classes = ['rt-Skeleton']
  const style: Record<string, string> = {}
  for (const dimension of dimensions) {
    classes.push(...dimension.classes)
    Object.assign(style, dimension.style)
  }
  const margin = marginClasses(props)
  classes.push(...margin.classes)
  Object.assign(style, margin.style)
  const attrs: Attribute<Message>[] = [
    h.Class(classes.join(' ')),
    h.Attribute('data-inline-skeleton', ''),
    h.AriaHidden(true),
    h.Attribute('tabindex', '-1'),
    h.Attribute('inert', ''),
  ]
  if (Object.keys(style).length) attrs.push(h.Style(style))
  return brandViewResult(h.span(attrs, children), 'wseffect/Skeleton')
}
