import { brandViewResult } from 'foldkit/brand'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
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
const scalarHeadingClasses = Object.freeze(Object.fromEntries(
  ['', ...sizes].flatMap(size => ['', ...weights].flatMap(weight => ['', ...alignments].map(align => {
    const values = ['rt-Heading']
    if (size !== '') values.push(`rt-r-size-${size}`)
    if (weight !== '') values.push(`rt-r-weight-${weight}`)
    if (align !== '') values.push(`rt-r-ta-${align}`)
    return [`${size}:${weight}:${align}`, values.join(' ')] as const
  }))),
))
export const Props = Schema.Struct({
  as: Schema.optional(Schema.Literals(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])),
  size: Schema.optional(responsiveSchema(sizes)),
  weight: Schema.optional(responsiveSchema(weights)),
  align: Schema.optional(responsiveSchema(alignments)),
  color: Schema.optional(Schema.String),
  ...marginPropSchemas,
})
export type ViewProps = typeof Props.Type

export const view = <Message>(
  props: ViewProps,
  children: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Message>,
): Html => {
  const sizeValue = props.size ?? '6'
  const responsive = typeof sizeValue === 'object' || typeof props.weight === 'object' || typeof props.align === 'object'
  const size = responsive ? responsiveClasses(sizeProp, sizeValue) : undefined
  const weight = responsive ? responsiveClasses(weightProp, props.weight) : undefined
  const align = responsive ? responsiveClasses(alignProp, props.align) : undefined
  const margin = marginClasses(props)
  const scalarClass = responsive ? undefined : scalarHeadingClasses[`${sizeValue}:${props.weight ?? ''}:${props.align ?? ''}`]
  const classValues = scalarClass === undefined
    ? ['rt-Heading', ...(size?.classes ?? []), ...(weight?.classes ?? []), ...(align?.classes ?? [])]
    : [scalarClass]
  const style = { ...size?.style, ...weight?.style, ...align?.style, ...margin.style }
  return brandViewResult(styledElement(props.as ?? 'h1', [...classValues, ...margin.classes], style, children, h), 'wseffect/Heading')
}
