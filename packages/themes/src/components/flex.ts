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

const directionValues = ['row', 'column', 'row-reverse', 'column-reverse'] as const
const alignValues = ['start', 'center', 'end', 'baseline', 'stretch'] as const
const justifyValues = ['start', 'center', 'end', 'between'] as const
const wrapValues = ['nowrap', 'wrap', 'wrap-reverse'] as const
const directionProp = responsiveProp({ className: 'rt-r-fd', values: directionValues })
const alignProp = responsiveProp({ className: 'rt-r-ai', values: alignValues })
const justifyProp = responsiveProp({ className: 'rt-r-jc', values: justifyValues, classNames: { between: 'rt-r-jc-space-between' } })
const wrapProp = responsiveProp({ className: 'rt-r-fw', values: wrapValues })

export const Props = Schema.Struct({
  as: Schema.optional(Schema.Literals(['div', 'span'])),
  direction: Schema.optional(responsiveSchema(directionValues)),
  align: Schema.optional(responsiveSchema(alignValues)),
  justify: Schema.optional(responsiveSchema(justifyValues)),
  wrap: Schema.optional(responsiveSchema(wrapValues)),
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
  const direction = responsiveClasses(directionProp, props.direction)
  const align = responsiveClasses(alignProp, props.align)
  const justify = responsiveClasses(justifyProp, props.justify)
  const wrap = responsiveClasses(wrapProp, props.wrap)
  const gap = responsiveClasses(gapPropDefs.gap, props.gap)
  const gapX = responsiveClasses(gapPropDefs.gapX, props.gapX)
  const gapY = responsiveClasses(gapPropDefs.gapY, props.gapY)
  const padding = paddingClasses(props)
  const margin = marginClasses(props)
  return brandViewResult(styledElement(props.as ?? 'div', ['rt-Flex', ...direction.classes, ...align.classes, ...justify.classes, ...wrap.classes, ...gap.classes, ...gapX.classes, ...gapY.classes, ...padding.classes, ...margin.classes], {
    ...direction.style, ...align.style, ...justify.style, ...wrap.style, ...gap.style, ...gapX.style, ...gapY.style, ...padding.style, ...margin.style,
  }, children, h), 'wseffect/Flex')
}
