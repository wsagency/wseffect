import { brandViewResult } from 'foldkit/brand'
import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
const sizes = ['1', '2', '3'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const scalarClasses = Object.freeze({ '1': 'rt-Spinner rt-r-size-1', '2': 'rt-Spinner rt-r-size-2', '3': 'rt-Spinner rt-r-size-3' })
export const Props = Schema.Struct({ size: Schema.optional(responsiveSchema(sizes)), loading: Schema.optional(Schema.Boolean), ...marginPropSchemas })
export type ViewProps = typeof Props.Type
export const view = <Message>(props: ViewProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  if (props.loading === false) return h.span([], children)
  const size = props.size ?? '2'
  const margin = marginClasses(props)
  const className = [typeof size === 'string' ? scalarClasses[size as keyof typeof scalarClasses] : ['rt-Spinner', ...responsiveClasses(sizeProp, size).classes].join(' '), ...margin.classes].join(' ')
  const attrs = [h.Class(className), ...(Object.keys(margin.style).length ? [h.Style(margin.style)] : [])]
  const leaves = Array.from({ length: 8 }, () => h.span([h.Class('rt-SpinnerLeaf')], []))
  const indicator = h.span(attrs, leaves)
  if (children.length === 0) return brandViewResult(indicator, 'wseffect/Spinner')
  return brandViewResult(h.span([h.Class('rt-Flex rt-r-ai-center rt-r-jc-center rt-r-position-relative')], [
    h.span([h.AriaHidden(true), h.Style({ display: 'contents', visibility: 'hidden' })], children),
    h.span([h.Class('rt-Flex rt-r-ai-center rt-r-jc-center rt-r-position-absolute rt-r-inset-0')], [indicator]),
  ]), 'wseffect/Spinner')
}
