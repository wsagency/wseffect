import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { brandViewResult } from 'foldkit/brand'
import * as ProgressUi from '@foldkit/ui/progress'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import { accentColors } from '../props/color.props.js'
import { radii } from '../props/radius.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
const sizes = ['1', '2', '3'] as const
const variants = ['classic', 'surface', 'soft'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const variantClasses = Object.freeze({ classic: 'rt-variant-classic', surface: 'rt-variant-surface', soft: 'rt-variant-soft' })
export const Props = Schema.Struct({
  id: Schema.optional(Schema.String), ariaLabel: Schema.optional(Schema.String), ariaLabelledBy: Schema.optional(Schema.String),
  size: Schema.optional(responsiveSchema(sizes)), variant: Schema.optional(Schema.Literals(variants)),
  color: Schema.optional(Schema.Literals(accentColors)), highContrast: Schema.optional(Schema.Boolean), radius: Schema.optional(Schema.Literals(radii)),
  value: Schema.optional(Schema.NullOr(Schema.Number)), min: Schema.optional(Schema.Number), max: Schema.optional(Schema.Number),
  valueText: Schema.optional(Schema.String), getValueLabel: Schema.optional(Schema.Unknown), duration: Schema.optional(Schema.String),
  ...marginPropSchemas,
})
export type ViewProps = typeof Props.Type & Readonly<{ getValueLabel?: (value: number, max: number) => string }>
const defaultGetValueLabel = (value: number, max: number): string => `${Math.round(value / max * 100)}%`
export const view = <Message>(props: ViewProps, _children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const size = responsiveClasses(sizeProp, props.size ?? '2')
  const margin = marginClasses(props)
  const rootClasses = ['rt-ProgressRoot', ...size.classes, variantClasses[props.variant ?? 'surface'], ...(props.highContrast ? ['rt-high-contrast'] : []), ...margin.classes].join(' ')
  const max = props.max ?? 100
  const progressAttributes: Attribute<Message>[] = [h.Class(rootClasses), h.DataAttribute('max', String(max))]
  if (props.value === undefined || props.value === null) {
    progressAttributes.push(h.AriaValuemin(props.min ?? 0), h.AriaValuemax(max))
  }
  if (props.color !== undefined) progressAttributes.push(h.DataAttribute('accent-color', props.color))
  if (props.radius !== undefined) progressAttributes.push(h.DataAttribute('radius', props.radius))
  const style: Record<string, string> = { ...size.style, ...margin.style }
  if (props.value !== undefined && props.value !== null) style['--progress-value'] = String(props.value)
  if (props.max !== undefined) style['--progress-max'] = String(props.max)
  if (props.duration !== undefined) style['--progress-duration'] = props.duration
  if (Object.keys(style).length) progressAttributes.push(h.Style(style))
  const getValueLabel = props.getValueLabel ?? defaultGetValueLabel
  const valueText: string | ((value: number, max: number) => string) = props.valueText ?? getValueLabel
  return brandViewResult(ProgressUi.view({
    id: props.id ?? '', value: props.value ?? undefined, min: props.min, max: props.max,
    valueText, ariaLabel: props.ariaLabel, ariaLabelledBy: props.ariaLabelledBy,
    toView: ({ progress, indicator }) => {
      const attributes = progressAttributes.concat(progress.filter(attribute =>
        (props.id !== undefined || attribute._tag !== 'Id') &&
        (props.ariaLabel !== undefined || props.ariaLabelledBy !== undefined || attribute._tag !== 'AriaLabelledBy') &&
        !(attribute._tag === 'DataAttribute' && attribute.key === 'max')))
      const indicatorAttributes: Attribute<Message>[] = [h.Class('rt-ProgressIndicator')]
      for (const attribute of indicator) {
        if (attribute._tag !== 'Style') indicatorAttributes.push(attribute)
      }
      return h.div(attributes, [h.div(indicatorAttributes, [])])
    },
  }, h), 'wseffect/Progress')
}
