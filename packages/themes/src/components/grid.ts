import { responsiveProp } from '../props/responsive.js'
import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { styledElement } from './element.js'
import { gapPropDefs } from '../props/gap.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveClasses } from '../props/responsive.js'

const columnsValues = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const rowsValues = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const flowValues = ['row', 'column', 'dense', 'row-dense', 'column-dense'] as const
const alignValues = ['start', 'center', 'end', 'baseline', 'stretch'] as const
const justifyValues = ['start', 'center', 'end', 'between'] as const
const gridTemplateColumns = responsiveProp({ className: 'rt-r-gtc', values: columnsValues, customProperties: ['--grid-template-columns'] })
const gridTemplateRows = responsiveProp({ className: 'rt-r-gtr', values: rowsValues, customProperties: ['--grid-template-rows'] })
const flowProp = responsiveProp({ className: 'rt-r-gaf', values: flowValues })
const alignProp = responsiveProp({ className: 'rt-r-ai', values: alignValues })
const justifyProp = responsiveProp({ className: 'rt-r-jc', values: justifyValues })
export const Props = Schema.Struct({
  as: Schema.optional(Schema.Literals(['div', 'span'])),
  columns: Schema.optional(responsiveSchema(columnsValues, true)),
  rows: Schema.optional(responsiveSchema(rowsValues, true)),
  flow: Schema.optional(responsiveSchema(flowValues)),
  align: Schema.optional(responsiveSchema(alignValues)),
  justify: Schema.optional(responsiveSchema(justifyValues)),
  gap: Schema.optional(responsiveSchema(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], true)),
  gapX: Schema.optional(responsiveSchema(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], true)),
  gapY: Schema.optional(responsiveSchema(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], true)),
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
  const gap = responsiveClasses(gapPropDefs.gap, props.gap)
  const gapX = responsiveClasses(gapPropDefs.gapX, props.gapX)
  const gapY = responsiveClasses(gapPropDefs.gapY, props.gapY)
  return styledElement(props.as ?? 'div', ['rt-Grid', ...columns.classes, ...rows.classes, ...flow.classes, ...align.classes, ...justify.classes, ...gap.classes, ...gapX.classes, ...gapY.classes], {
    ...columns.style, ...rows.style, ...flow.style, ...align.style, ...justify.style, ...gap.style, ...gapX.style, ...gapY.style,
  }, children, h)
}
