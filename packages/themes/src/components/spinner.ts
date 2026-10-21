import { brandViewResult } from 'foldkit/brand'
import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
const sizes = ['1', '2', '3'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes, classNames: { '1': 'rt-r-size-1', '2': 'rt-r-size-2', '3': 'rt-r-size-2' } })
const scalarClasses = Object.freeze({ '1': 'rt-Spinner rt-r-size-1', '2': 'rt-Spinner rt-r-size-2', '3': 'rt-Spinner rt-r-size-2' })
export const Props = Schema.Struct({ size: Schema.optional(responsiveSchema(sizes)), loading: Schema.optional(Schema.Boolean) })
export type ViewProps = typeof Props.Type
export const view = <Message>(props: ViewProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  if (props.loading === false) return h.span([], children)
  const size = props.size ?? '2'
  const className = typeof size === 'string' ? scalarClasses[size as keyof typeof scalarClasses] : ['rt-Spinner', ...responsiveClasses(sizeProp, size).classes].join(' ')
  const leaves = Array.from({ length: 8 }, () => h.span([h.Class('rt-SpinnerLeaf')], []))
  const indicator = h.span([h.Class(className)], leaves)
  return brandViewResult(children.length === 0 ? indicator : h.span([], [h.span([h.AriaHidden(true)], children), indicator]), 'wseffect/Spinner')
}
