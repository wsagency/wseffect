import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { brandViewResult } from 'foldkit/brand'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import { radii } from '../props/radius.props.js'
const sizes = ['1', '2', '3'] as const
const scrollbars = ['vertical', 'horizontal', 'both'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
export const Props = Schema.Struct({ size: Schema.optional(responsiveSchema(sizes)), radius: Schema.optional(Schema.Literals(radii)), scrollbars: Schema.optional(Schema.Literals(scrollbars)) })
export type ViewProps = typeof Props.Type
export const view = <Message>(props: ViewProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const size = responsiveClasses(sizeProp, props.size ?? '1')
  const attributes: Attribute<Message>[] = [h.Class(['rt-ScrollAreaRoot', ...size.classes].join(' '))]
  if (props.radius !== undefined) attributes.push(h.DataAttribute('radius', props.radius))
  const scrollbars = props.scrollbars ?? 'both'
  const viewportStyle = {
    'overflow-x': scrollbars === 'vertical' ? 'hidden' : 'auto',
    'overflow-y': scrollbars === 'horizontal' ? 'hidden' : 'auto',
  }
  const viewportAttributes: Attribute<Message>[] = [h.Class('rt-ScrollAreaViewport'), h.Attribute('tabindex', '0'), h.Style(viewportStyle)]
  const focusRing = h.div([h.Class('rt-ScrollAreaViewportFocusRing'), h.AriaHidden(true)], [])
  return brandViewResult(h.div(attributes, [h.div(viewportAttributes, children), focusRing]), 'wseffect/ScrollArea')
}
