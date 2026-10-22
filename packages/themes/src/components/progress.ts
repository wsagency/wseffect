import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { brandViewResult } from 'foldkit/brand'
import * as ProgressUi from '@foldkit/ui/progress'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import { accentColors } from '../props/color.props.js'
import { radii } from '../props/radius.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
const sizes = ['1', '2', '3'] as const
const variants = ['classic', 'surface', 'soft'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const variantClasses = Object.freeze({ classic: 'rt-variant-classic', surface: 'rt-variant-surface', soft: 'rt-variant-soft' })
export const Props = Schema.Struct({
  id: Schema.optional(Schema.String), ariaLabel: Schema.optional(Schema.String), ariaLabelledBy: Schema.optional(Schema.String),
  size: Schema.optional(responsiveSchema(sizes)), variant: Schema.optional(Schema.Literals(variants)),
  color: Schema.optional(Schema.Literals(accentColors)), highContrast: Schema.optional(Schema.Boolean), radius: Schema.optional(Schema.Literals(radii)),
  value: Schema.optional(Schema.Number), min: Schema.optional(Schema.Number), max: Schema.optional(Schema.Number),
  valueText: Schema.optional(Schema.String), duration: Schema.optional(Schema.String),
})
export type ViewProps = typeof Props.Type
export const view = <Message>(props: ViewProps, _children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const classes = responsiveClasses(sizeProp, props.size ?? '2').classes
  const rootClasses = ['rt-ProgressRoot', ...classes, variantClasses[props.variant ?? 'surface'], ...(props.highContrast ? ['rt-high-contrast'] : [])].join(' ')
  const progressAttributes: Attribute<Message>[] = [h.Class(rootClasses)]
  if (props.color !== undefined) progressAttributes.push(h.DataAttribute('accent-color', props.color))
  if (props.radius !== undefined) progressAttributes.push(h.DataAttribute('radius', props.radius))
  if (props.duration !== undefined) progressAttributes.push(h.Style({ '--progress-duration': props.duration }))
  return brandViewResult(ProgressUi.view({
    id: props.id ?? '', value: props.value, min: props.min, max: props.max,
    valueText: props.valueText, ariaLabel: props.ariaLabel, ariaLabelledBy: props.ariaLabelledBy,
    toView: ({ progress, indicator }) => {
      const attributes = progressAttributes.concat(progress.filter(attribute =>
        (props.id !== undefined || attribute._tag !== 'Id') &&
        (props.ariaLabel !== undefined || props.ariaLabelledBy !== undefined || attribute._tag !== 'AriaLabelledBy')))
      return h.div(attributes, [h.div([h.Class('rt-ProgressIndicator'), ...indicator], [])])
    },
  }, h), 'wseffect/Progress')
}
