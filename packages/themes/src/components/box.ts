import { brandViewResult } from 'foldkit/brand'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { responsiveSchema } from '../props/componentSchema.js'
import { layoutPropDefs } from '../props/layout.props.js'
import { paddingClasses, paddingPropSchemas } from '../props/padding.props.js'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
import { styledElement } from './element.js'

const displayValues = ['none', 'inline', 'inline-block', 'block', 'contents', 'flex', 'inline-flex', 'grid', 'inline-grid'] as const
const displayProp = responsiveProp({ className: 'rt-r-display', values: displayValues })

export const Props = Schema.Struct({
  as: Schema.optional(Schema.Literals(['div', 'span'])),
  display: Schema.optional(responsiveSchema(displayValues)),
  position: Schema.optional(responsiveSchema(['static', 'relative', 'absolute', 'fixed', 'sticky'])),
  overflow: Schema.optional(responsiveSchema(['visible', 'hidden', 'clip', 'scroll', 'auto'])),
  width: Schema.optional(responsiveSchema([], true)),
  minWidth: Schema.optional(responsiveSchema([], true)),
  maxWidth: Schema.optional(responsiveSchema([], true)),
  height: Schema.optional(responsiveSchema([], true)),
  minHeight: Schema.optional(responsiveSchema([], true)),
  maxHeight: Schema.optional(responsiveSchema([], true)),
  ...paddingPropSchemas,
  ...marginPropSchemas,
})
export type ViewProps = typeof Props.Type

export const view = <Message>(props: ViewProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const results = [
    responsiveClasses(displayProp, props.display),
    responsiveClasses(layoutPropDefs.position, props.position),
    responsiveClasses(layoutPropDefs.overflow, props.overflow),
    responsiveClasses(layoutPropDefs.width, props.width),
    responsiveClasses(layoutPropDefs.minWidth, props.minWidth),
    responsiveClasses(layoutPropDefs.maxWidth, props.maxWidth),
    responsiveClasses(layoutPropDefs.height, props.height),
    responsiveClasses(layoutPropDefs.minHeight, props.minHeight),
    responsiveClasses(layoutPropDefs.maxHeight, props.maxHeight),
  ]
  const padding = paddingClasses(props)
  const margin = marginClasses(props)
  return brandViewResult(styledElement(props.as ?? 'div', ['rt-Box', ...results.flatMap(result => result.classes), ...padding.classes, ...margin.classes], Object.assign({}, ...results.map(result => result.style), padding.style, margin.style), children, h), 'wseffect/Box')
}
