import { brandViewResult } from 'foldkit/brand'
import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import { accentColors } from '../props/color.props.js'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
const orientations = ['horizontal', 'vertical'] as const
const sizes = ['1', '2', '3', '4'] as const
const orientationProp = responsiveProp({ className: 'rt-r-orientation', values: orientations })
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
export const Props = Schema.Struct({ orientation: Schema.optional(responsiveSchema(orientations)), size: Schema.optional(responsiveSchema(sizes)), color: Schema.optional(Schema.Literals(accentColors)), decorative: Schema.optional(Schema.Boolean), ...marginPropSchemas })
export type ViewProps = typeof Props.Type
export const view = <Message>(props: ViewProps, _children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const orientation = responsiveClasses(orientationProp, props.orientation ?? 'horizontal')
  const size = responsiveClasses(sizeProp, props.size ?? '1')
  const margin = marginClasses(props)
  const attrs: Attribute<Message>[] = [h.Class(['rt-Separator', ...orientation.classes, ...size.classes, ...margin.classes].join(' ')), h.DataAttribute('accent-color', props.color ?? 'gray')]
  if (props.decorative === false && typeof props.orientation !== 'object') attrs.push(h.Attribute('aria-orientation', props.orientation ?? 'horizontal'))
  if (props.decorative === false) attrs.push(h.Role('separator'))
  const styles = { ...orientation.style, ...size.style, ...margin.style }
  if (Object.keys(styles).length) attrs.push(h.Style(styles))
  return brandViewResult(h.span(attrs, []), 'wseffect/Separator')
}
