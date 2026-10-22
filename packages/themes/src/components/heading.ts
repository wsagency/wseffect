import { brandViewResult } from 'foldkit/brand'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { marginClasses } from '../props/margin.classes.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import type { ViewProps } from './heading.props.js'
import { element } from './element.js'
export { Props } from './heading.props.js'
export type { ViewProps } from './heading.props.js'
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
  const attributes: Attribute<Message>[] = []
  if (classValues.length > 0 || margin.classes.length > 0) attributes.push(h.Class([...classValues, ...margin.classes].join(' ')))
  if (props.color !== undefined) attributes.push(h.DataAttribute('accent-color', props.color))
  if (Object.keys(style).length > 0) attributes.push(h.Style(style))
  return brandViewResult(element(props.as ?? 'h1', attributes, children, h), 'wseffect/Heading')
}
