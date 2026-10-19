import { responsiveProp } from '../props/responsive.js'
import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
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
})
export type ViewProps = typeof Props.Type

export const view = <Message>(
  props: ViewProps,
  children: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Message>,
): Html => {
  const size = responsiveClasses(sizeProp, props.size)
  return styledElement(props.as ?? 'div', ['rt-Card', ...size.classes, variantClasses[props.variant ?? 'surface']], size.style, children, h)
}
