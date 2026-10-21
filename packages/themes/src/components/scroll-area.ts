import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { brandViewResult } from 'foldkit/brand'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import { radii } from '../props/radius.props.js'
const sizes = ['1', '2', '3'] as const
const scrollbars = ['vertical', 'horizontal', 'both'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const scrollbarClasses = Object.freeze({ vertical: 'rt-scrollbars-vertical', horizontal: 'rt-scrollbars-horizontal', both: 'rt-scrollbars-both' })
export const Props = Schema.Struct({ size: Schema.optional(responsiveSchema(sizes)), radius: Schema.optional(Schema.Literals(radii)), scrollbars: Schema.optional(Schema.Literals(scrollbars)) })
export type ViewProps = typeof Props.Type
export const view = <Message>(props: ViewProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const size = responsiveClasses(sizeProp, props.size ?? '1')
  const attributes: Attribute<Message>[] = [h.Class(['rt-ScrollAreaRoot', ...size.classes].join(' '))]
  if (props.radius !== undefined) attributes.push(h.DataAttribute('radius', props.radius))
  const viewportAttributes = [h.Class('rt-ScrollAreaViewport'), h.Attribute('tabindex', '0')]
  const trackbars: Html[] = []
  if (props.scrollbars !== 'vertical') trackbars.push(h.div([h.Class('rt-ScrollAreaScrollbar rt-ScrollAreaScrollbarHorizontal'), h.AriaHidden(true)], []))
  if (props.scrollbars !== 'horizontal') trackbars.push(h.div([h.Class('rt-ScrollAreaScrollbar rt-ScrollAreaScrollbarVertical'), h.AriaHidden(true)], []))
  return brandViewResult(h.div(attributes, [h.div(viewportAttributes, children), ...trackbars]), 'wseffect/ScrollArea')
}
