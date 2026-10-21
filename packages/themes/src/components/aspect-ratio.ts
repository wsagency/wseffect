import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { brandViewResult } from 'foldkit/brand'
export const Props = Schema.Struct({ ratio: Schema.optional(Schema.Number) })
export type ViewProps = typeof Props.Type
const wrapperStyle = Object.freeze({ position: 'relative', width: '100%' })
const contentStyle = Object.freeze({ position: 'absolute', top: '0', right: '0', bottom: '0', left: '0' })
export const view = <Message>(props: ViewProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const paddingBottom = `${100 / (props.ratio ?? 1)}%`
  return brandViewResult(h.div([h.Attribute('data-radix-aspect-ratio-wrapper', ''), h.Style({ ...wrapperStyle, 'padding-bottom': paddingBottom })], [h.div([h.Style(contentStyle)], children)]), 'wseffect/AspectRatio')
}
