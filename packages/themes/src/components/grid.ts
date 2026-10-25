import { brandViewResult } from '@wsagency/wseffect-foldkit/brand'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
import { paddingClasses, paddingPropSchemas } from '../props/padding.props.js'
import { responsiveProp } from '../props/responsive.js'
import { Schema } from 'effect'
import type { Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { styledElement } from './element.js'
import { gapPropDefs } from '../props/gap.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveClasses } from '../props/responsive.js'

const columnsValues = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const rowsValues = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const flowValues = ['row', 'column', 'dense', 'row-dense', 'column-dense'] as const
const alignValues = ['start', 'center', 'end', 'baseline', 'stretch'] as const
const justifyValues = ['start', 'center', 'end', 'between'] as const
const alignContentValues = ['start', 'center', 'end', 'baseline', 'between', 'around', 'evenly', 'stretch'] as const
const justifyItemsValues = ['start', 'center', 'end', 'baseline', 'stretch'] as const
const gridTemplateColumns = responsiveProp({
  className: 'rt-r-gtc', values: columnsValues, customProperties: ['--grid-template-columns'],
  parseValue: value => value.match(/^\d+$/) ? `repeat(${value}, minmax(0, 1fr))` : value,
})
const gridTemplateRows = responsiveProp({
  className: 'rt-r-gtr', values: rowsValues, customProperties: ['--grid-template-rows'],
  parseValue: value => value.match(/^\d+$/) ? `repeat(${value}, minmax(0, 1fr))` : value,
})
const flowProp = responsiveProp({ className: 'rt-r-gaf', values: flowValues })
const alignProp = responsiveProp({ className: 'rt-r-ai', values: alignValues })
const justifyProp = responsiveProp({ className: 'rt-r-jc', values: justifyValues, classNames: { between: 'rt-r-jc-space-between' } })
const alignContentProp = responsiveProp({ className: 'rt-r-ac', values: alignContentValues, classNames: {
  between: 'rt-r-ac-space-between', around: 'rt-r-ac-space-around', evenly: 'rt-r-ac-space-evenly',
} })
const justifyItemsProp = responsiveProp({ className: 'rt-r-ji', values: justifyItemsValues })
export const Props = Schema.Struct({
  as: Schema.optional(Schema.Literals(['div', 'span'])),
  columns: Schema.optional(responsiveSchema(columnsValues, true)),
  rows: Schema.optional(responsiveSchema(rowsValues, true)),
  flow: Schema.optional(responsiveSchema(flowValues)),
  align: Schema.optional(responsiveSchema(alignValues)),
  justify: Schema.optional(responsiveSchema(justifyValues)),
  alignContent: Schema.optional(responsiveSchema(alignContentValues)),
  justifyItems: Schema.optional(responsiveSchema(justifyItemsValues)),
  gap: Schema.optional(responsiveSchema(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], true)),
  gapX: Schema.optional(responsiveSchema(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], true)),
  gapY: Schema.optional(responsiveSchema(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], true)),
  ...paddingPropSchemas,
  ...marginPropSchemas,
})
export type ViewProps = typeof Props.Type

export const view = <Message>(
  props: ViewProps,
  children: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Message>,
): Html => {
  const columns = responsiveClasses(gridTemplateColumns, props.columns)
  const rows = responsiveClasses(gridTemplateRows, props.rows)
  const flow = responsiveClasses(flowProp, props.flow)
  const align = responsiveClasses(alignProp, props.align)
  const justify = responsiveClasses(justifyProp, props.justify)
  const alignContent = responsiveClasses(alignContentProp, props.alignContent)
  const justifyItems = responsiveClasses(justifyItemsProp, props.justifyItems)
  const gap = responsiveClasses(gapPropDefs.gap, props.gap)
  const gapX = responsiveClasses(gapPropDefs.gapX, props.gapX)
  const gapY = responsiveClasses(gapPropDefs.gapY, props.gapY)
  const padding = paddingClasses(props)
  const margin = marginClasses(props)
  return brandViewResult(styledElement(props.as ?? 'div', ['rt-Grid', ...columns.classes, ...rows.classes, ...flow.classes, ...align.classes, ...justify.classes, ...alignContent.classes, ...justifyItems.classes, ...gap.classes, ...gapX.classes, ...gapY.classes, ...padding.classes, ...margin.classes], {
    ...columns.style, ...rows.style, ...flow.style, ...align.style, ...justify.style, ...alignContent.style, ...justifyItems.style, ...gap.style, ...gapX.style, ...gapY.style, ...padding.style, ...margin.style,
  }, children, h), 'wseffect/Grid')
}
