import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { brandViewResult } from 'foldkit/brand'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import { radii } from '../props/radius.props.js'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
import { mountScrollArea } from './scroll-area.mount.js'
const sizes = ['1', '2', '3'] as const
const scrollbars = ['vertical', 'horizontal', 'both'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
export const Props = Schema.Struct({ size: Schema.optional(responsiveSchema(sizes)), radius: Schema.optional(Schema.Literals(radii)), scrollbars: Schema.optional(Schema.Literals(scrollbars)), ...marginPropSchemas })
export type ViewProps = typeof Props.Type
export const view = <Message>(props: ViewProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const size = responsiveClasses(sizeProp, props.size ?? '1')
  const margin = marginClasses(props)
  const attributes: Attribute<Message>[] = [h.Class(['rt-ScrollAreaRoot', ...margin.classes].join(' ')), h.Style({ position: 'relative' }), h.OnMount(mountScrollArea())]
  if (Object.keys(margin.style).length) attributes.push(h.Style(margin.style))
  const scrollbars = props.scrollbars ?? 'both'
  const viewportAttributes: Attribute<Message>[] = [
    h.Class('rt-ScrollAreaViewport'), h.Attribute('tabindex', '0'),
    h.Style({ 'overflow-x': 'auto', 'overflow-y': 'auto', 'scrollbar-width': 'none' }),
  ]
  const focusRing = h.div([h.Class('rt-ScrollAreaViewportFocusRing'), h.AriaHidden(true)], [])
  const scrollbar = (orientation: 'horizontal' | 'vertical') => h.div([
    h.Class(['rt-ScrollAreaScrollbar', ...size.classes].join(' ')),
    h.DataAttribute('orientation', orientation),
    h.DataAttribute('state', 'hidden'),
    h.Attribute('aria-hidden', 'true'),
    h.Style(orientation === 'horizontal'
      ? { left: '0', right: '0', bottom: '0' }
      : { top: '0', bottom: '0', right: '0' }),
    ...(props.radius === undefined ? [] : [h.DataAttribute('radius', props.radius)]),
  ], [h.div([h.Class('rt-ScrollAreaThumb')], [])])
  const content: Html[] = [h.div(viewportAttributes, children), focusRing]
  if (scrollbars !== 'vertical') content.push(scrollbar('horizontal'))
  if (scrollbars !== 'horizontal') content.push(scrollbar('vertical'))
  if (scrollbars === 'both') content.push(h.div([h.Class('rt-ScrollAreaCorner')], []))
  return brandViewResult(h.div(attributes, content), 'wseffect/ScrollArea')
}
