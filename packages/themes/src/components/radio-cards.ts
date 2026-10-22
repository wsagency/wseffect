import { brandViewResult } from 'foldkit/brand'
import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as RadioGroup from './radio-group.js'
import { accentColors } from '../props/color.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'

const sizes = ['1', '2', '3'] as const
const variants = ['surface', 'classic'] as const
const columns = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const gaps = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const columnsProp = responsiveProp({
  className: 'rt-r-gtc',
  values: columns,
  customProperties: ['--grid-template-columns'],
  parseValue: value => /^\d+$/.test(value) ? `repeat(${value}, minmax(0, 1fr))` : value,
})
const gapProp = responsiveProp({ className: 'rt-r-gap', values: gaps })
export const Props = Schema.Struct({
  size: Schema.optional(responsiveSchema(sizes)),
  variant: Schema.optional(Schema.Literals(variants)),
  color: Schema.optional(Schema.Literals(accentColors)),
  highContrast: Schema.optional(Schema.Boolean),
  columns: Schema.optional(responsiveSchema(columns, true)),
  gap: Schema.optional(responsiveSchema(gaps, true)),
})
export type Props = typeof Props.Type
export type Model = RadioGroup.Model
export type Message = RadioGroup.Message
export type OutMessage<Value extends string> = RadioGroup.OutMessage<Value>
export type ViewInputs<Value extends string> = Omit<RadioGroup.ViewInputs<Value>, 'props'> & Readonly<{ props?: Props }>
export type Bundle<Value extends string> = Omit<RadioGroup.Bundle<Value>, 'view'> & Readonly<{
  view(model: Model, inputs: ViewInputs<Value>, h: HtmlBuilder<Message>): Html
}>
export const create = <Value extends string>(): Bundle<Value> => {
  const group = RadioGroup.create<Value>()
  const view = (model: Model, inputs: ViewInputs<Value>, h: HtmlBuilder<Message>): Html => {
    const columns = responsiveClasses(columnsProp, inputs.props?.columns ?? 'repeat(auto-fit, minmax(200px, 1fr))')
    const gap = responsiveClasses(gapProp, inputs.props?.gap ?? '4')
    const rootClass = ['rt-Grid', 'rt-RadioCardsRoot', ...columns.classes, ...gap.classes].join(' ')
    return brandViewResult(group.view(model, {
      ...inputs,
      props: {
        ...inputs.props,
        rootClass,
        rootStyle: { ...columns.style, ...gap.style },
        itemClass: 'rt-reset rt-BaseCard rt-RadioCardsItem',
      },
    }, h), 'wseffect/RadioCards')
  }
  return { ...group, view }
}
