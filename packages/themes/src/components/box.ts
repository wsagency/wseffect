import { brandViewResult } from 'foldkit/brand'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { responsiveSchema } from '../props/componentSchema.js'
import { layoutPropDefs } from '../props/layout.props.js'
import { marginPropDefs, marginValues } from '../props/margin.props.js'
import { paddingPropDefs, paddingValues } from '../props/padding.props.js'
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
  p: Schema.optional(responsiveSchema(paddingValues, true)),
  px: Schema.optional(responsiveSchema(paddingValues, true)),
  py: Schema.optional(responsiveSchema(paddingValues, true)),
  pt: Schema.optional(responsiveSchema(paddingValues, true)),
  pr: Schema.optional(responsiveSchema(paddingValues, true)),
  pb: Schema.optional(responsiveSchema(paddingValues, true)),
  pl: Schema.optional(responsiveSchema(paddingValues, true)),
  m: Schema.optional(responsiveSchema(marginValues, true)),
  mx: Schema.optional(responsiveSchema(marginValues, true)),
  my: Schema.optional(responsiveSchema(marginValues, true)),
  mt: Schema.optional(responsiveSchema(marginValues, true)),
  mr: Schema.optional(responsiveSchema(marginValues, true)),
  mb: Schema.optional(responsiveSchema(marginValues, true)),
  ml: Schema.optional(responsiveSchema(marginValues, true)),
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
    responsiveClasses(paddingPropDefs.p, props.p),
    responsiveClasses(paddingPropDefs.px, props.px),
    responsiveClasses(paddingPropDefs.py, props.py),
    responsiveClasses(paddingPropDefs.pt, props.pt),
    responsiveClasses(paddingPropDefs.pr, props.pr),
    responsiveClasses(paddingPropDefs.pb, props.pb),
    responsiveClasses(paddingPropDefs.pl, props.pl),
    responsiveClasses(marginPropDefs.m, props.m),
    responsiveClasses(marginPropDefs.mx, props.mx),
    responsiveClasses(marginPropDefs.my, props.my),
    responsiveClasses(marginPropDefs.mt, props.mt),
    responsiveClasses(marginPropDefs.mr, props.mr),
    responsiveClasses(marginPropDefs.mb, props.mb),
    responsiveClasses(marginPropDefs.ml, props.ml),
  ]
  return brandViewResult(styledElement(props.as ?? 'div', ['rt-Box', ...results.flatMap(result => result.classes)], Object.assign({}, ...results.map(result => result.style)), children, h), 'wseffect/Box')
}
