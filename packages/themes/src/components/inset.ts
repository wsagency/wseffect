import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { brandViewResult } from 'foldkit/brand'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
const sides = ['all', 'x', 'y', 'top', 'bottom', 'left', 'right'] as const
const clips = ['border-box', 'padding-box'] as const
const padding = ['current', '0'] as const
const sideProp = responsiveProp({ className: 'rt-r-side', values: sides })
const clipProp = responsiveProp({ className: 'rt-r-clip', values: clips })
const pProp = responsiveProp({ className: 'rt-r-p', values: padding, parseValue: value => value === 'current' ? 'inset' : value })
const pxProp = responsiveProp({ className: 'rt-r-px', values: padding, parseValue: value => value === 'current' ? 'inset' : value })
const pyProp = responsiveProp({ className: 'rt-r-py', values: padding, parseValue: value => value === 'current' ? 'inset' : value })
const ptProp = responsiveProp({ className: 'rt-r-pt', values: padding, parseValue: value => value === 'current' ? 'inset' : value })
const prProp = responsiveProp({ className: 'rt-r-pr', values: padding, parseValue: value => value === 'current' ? 'inset' : value })
const pbProp = responsiveProp({ className: 'rt-r-pb', values: padding, parseValue: value => value === 'current' ? 'inset' : value })
const plProp = responsiveProp({ className: 'rt-r-pl', values: padding, parseValue: value => value === 'current' ? 'inset' : value })
export const Props = Schema.Struct({ side: Schema.optional(responsiveSchema(sides)), clip: Schema.optional(responsiveSchema(clips)), p: Schema.optional(responsiveSchema(padding)), px: Schema.optional(responsiveSchema(padding)), py: Schema.optional(responsiveSchema(padding)), pt: Schema.optional(responsiveSchema(padding)), pr: Schema.optional(responsiveSchema(padding)), pb: Schema.optional(responsiveSchema(padding)), pl: Schema.optional(responsiveSchema(padding)), ...marginPropSchemas })
export type ViewProps = typeof Props.Type
export const view = <Message>(props: ViewProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const result = [responsiveClasses(sideProp, props.side ?? 'all'), responsiveClasses(clipProp, props.clip ?? 'border-box'), responsiveClasses(pProp, props.p), responsiveClasses(pxProp, props.px), responsiveClasses(pyProp, props.py), responsiveClasses(ptProp, props.pt), responsiveClasses(prProp, props.pr), responsiveClasses(pbProp, props.pb), responsiveClasses(plProp, props.pl)]
  const margin = marginClasses(props)
  const classes = ['rt-Inset', ...result.flatMap(item => item.classes), ...margin.classes]
  const style = Object.assign({}, ...result.map(item => item.style), margin.style)
  return brandViewResult(h.div([h.Class(classes.join(' ')), ...(Object.keys(style).length ? [h.Style(style)] : [])], children), 'wseffect/Inset')
}
