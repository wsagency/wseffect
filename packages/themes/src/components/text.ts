import { responsiveProp } from '../props/responsive.js'
import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { element } from './element.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveClasses } from '../props/responsive.js'

const sizes = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const weights = ['light', 'regular', 'medium', 'bold'] as const
const alignments = ['left', 'center', 'right'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const weightProp = responsiveProp({ className: 'rt-r-weight', values: weights })
const alignProp = responsiveProp({ className: 'rt-r-ta', values: alignments })

export const Props = Schema.Struct({
  as: Schema.optional(Schema.Literals(['span', 'div', 'label', 'p'])),
  size: Schema.optional(responsiveSchema(sizes)),
  weight: Schema.optional(responsiveSchema(weights)),
  align: Schema.optional(responsiveSchema(alignments)),
  color: Schema.optional(Schema.String),
})
export type ViewProps = typeof Props.Type

export const view = <Message>(
  props: ViewProps,
  children: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Message>,
): Html => {
  const size = responsiveClasses(sizeProp, props.size)
  const weight = responsiveClasses(weightProp, props.weight)
  const align = responsiveClasses(alignProp, props.align)
  const classes = ['rt-Text', ...size.classes, ...weight.classes, ...align.classes]
  const style = { ...size.style, ...weight.style, ...align.style }
  const attributes: Attribute<Message>[] = [h.Class(classes.join(' '))]
  if (props.color !== undefined) attributes.push(h.DataAttribute('accent-color', props.color))
  if (Object.keys(style).length > 0) attributes.push(h.Style(style))
  return element(props.as ?? 'span', attributes, children, h)
}
