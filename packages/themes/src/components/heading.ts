import { responsiveProp } from '../props/responsive.js'
import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { styledElement } from './element.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveClasses } from '../props/responsive.js'

const sizes = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const weights = ['light', 'regular', 'medium', 'bold'] as const
const alignments = ['left', 'center', 'right'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const weightProp = responsiveProp({ className: 'rt-r-weight', values: weights })
const alignProp = responsiveProp({ className: 'rt-r-ta', values: alignments })
export const Props = Schema.Struct({
  as: Schema.optional(Schema.Literals(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])),
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
  const classes = ['rt-Heading', ...size.classes, ...weight.classes, ...align.classes]
  const style = { ...size.style, ...weight.style, ...align.style }
  return styledElement(props.as ?? 'h1', classes, style, children, h)
}
