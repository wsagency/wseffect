import { brandViewResult } from '@wsagency/wseffect-foldkit/brand'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
import { responsiveProp } from '../props/responsive.js'
import { Schema } from 'effect'
import type { Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { styledElement } from './element.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveClasses } from '../props/responsive.js'

const sizes = ['1', '2', '3', '4', '5'] as const
const variants = ['surface', 'classic', 'ghost'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const variantClasses = Object.freeze({
  surface: 'rt-variant-surface',
  classic: 'rt-variant-classic',
  ghost: 'rt-variant-ghost',
})

export const Props = Schema.Struct({
  as: Schema.optional(Schema.Literals(['div', 'span'])),
  size: Schema.optional(responsiveSchema(sizes)),
  variant: Schema.optional(Schema.Literals(variants)),
  ...marginPropSchemas,
})
export type ViewProps = typeof Props.Type

export const view = <Message>(
  props: ViewProps,
  children: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Message>,
): Html => {
  const size = responsiveClasses(sizeProp, props.size ?? '1')
  const margin = marginClasses(props)
  return brandViewResult(styledElement(props.as ?? 'div', ['rt-reset', 'rt-BaseCard', 'rt-Card', ...size.classes, variantClasses[props.variant ?? 'surface'], ...margin.classes], { ...size.style, ...margin.style }, children, h), 'wseffect/Card')
}
