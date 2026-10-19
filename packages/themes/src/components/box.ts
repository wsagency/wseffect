import { responsiveProp } from '../props/responsive.js'
import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { styledElement } from './element.js'
import { layoutPropDefs } from '../props/layout.props.js'
import { responsiveClasses } from '../props/responsive.js'
import { responsiveSchema } from '../props/componentSchema.js'

const displayValues = ['none', 'inline', 'inline-block', 'block', 'contents', 'flex', 'inline-flex', 'grid', 'inline-grid'] as const
const displayProp = responsiveProp({ className: 'rt-r-display', values: displayValues })

export const Props = Schema.Struct({
  as: Schema.optional(Schema.Literals(['div', 'span'])),
  display: Schema.optional(responsiveSchema(displayValues)),
  position: Schema.optional(responsiveSchema(['static', 'relative', 'absolute', 'fixed', 'sticky'])),
  overflow: Schema.optional(responsiveSchema(['visible', 'hidden', 'clip', 'scroll', 'auto'])),
  width: Schema.optional(responsiveSchema([], true)),
  height: Schema.optional(responsiveSchema([], true)),
})
export type ViewProps = typeof Props.Type

export const view = <Message>(
  props: ViewProps,
  children: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Message>,
): Html => {
  const display = responsiveClasses(displayProp, props.display)
  const position = responsiveClasses(layoutPropDefs.position, props.position)
  const overflow = responsiveClasses(layoutPropDefs.overflow, props.overflow)
  const width = responsiveClasses(responsiveProp({ className: 'rt-r-width', customProperties: ['--width'] }), props.width)
  const height = responsiveClasses(responsiveProp({ className: 'rt-r-height', customProperties: ['--height'] }), props.height)
  return styledElement(props.as ?? 'div', ['rt-Box', ...display.classes, ...position.classes, ...overflow.classes, ...width.classes, ...height.classes], {
    ...display.style, ...position.style, ...overflow.style, ...width.style, ...height.style,
  }, children, h)
}
