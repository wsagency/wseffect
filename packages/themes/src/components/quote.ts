import { brandViewResult } from 'foldkit/brand'
import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
const wraps = ['wrap', 'nowrap', 'pretty', 'balance'] as const
const wrapProp = responsiveProp({ className: 'rt-r-tw', values: wraps })
export const Props = Schema.Struct({ truncate: Schema.optional(Schema.Boolean), wrap: Schema.optional(responsiveSchema(wraps)) })
export type ViewProps = typeof Props.Type
export const view = <Message>(props: ViewProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const wrap = responsiveClasses(wrapProp, props.wrap)
  return brandViewResult(h.q([h.Class(['rt-Quote', ...wrap.classes, ...(props.truncate ? ['rt-truncate'] : [])].join(' ')), ...(Object.keys(wrap.style).length ? [h.Style(wrap.style)] : [])], children), 'wseffect/Quote')
}
