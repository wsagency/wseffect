import { brandViewResult } from 'foldkit/brand'
import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import { accentColors } from '../props/color.props.js'
import { radii } from '../props/radius.props.js'
import { responsiveSchema } from '../props/componentSchema.js'

const sizes = ['1', '2', '3'] as const
const variants = ['classic', 'surface', 'soft'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const variantClasses = Object.freeze({ classic: 'rt-variant-classic', surface: 'rt-variant-surface', soft: 'rt-variant-soft' })
export const Props = Schema.Struct({
  size: Schema.optional(responsiveSchema(sizes)), variant: Schema.optional(Schema.Literals(variants)),
  color: Schema.optional(Schema.Literals(accentColors)), highContrast: Schema.optional(Schema.Boolean),
  radius: Schema.optional(Schema.Literals(radii)), value: Schema.optional(Schema.Number),
  max: Schema.optional(Schema.Number), duration: Schema.optional(Schema.String),
})
export type ViewProps = typeof Props.Type

export const view = <Message>(props: ViewProps, _children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const classes = responsiveClasses(sizeProp, props.size ?? '2').classes
  const attributes: Attribute<Message>[] = [h.Class(['rt-ProgressRoot', ...classes, variantClasses[props.variant ?? 'surface'], ...(props.highContrast ? ['rt-high-contrast'] : [])].join(' ')), h.Role('progressbar')]
  if (props.color !== undefined) attributes.push(h.DataAttribute('accent-color', props.color))
  if (props.radius !== undefined) attributes.push(h.DataAttribute('radius', props.radius))
  if (props.value !== undefined) attributes.push(h.Attribute('aria-valuenow', String(props.value)))
  if (props.max !== undefined) attributes.push(h.Attribute('aria-valuemax', String(props.max)))
  if (props.duration !== undefined) attributes.push(h.Style({ '--progress-duration': props.duration }))
  return brandViewResult(h.div(attributes, [h.div([h.Class('rt-ProgressIndicator')], [])]), 'wseffect/Progress')
}
