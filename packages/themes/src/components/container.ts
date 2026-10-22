import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { brandViewResult } from 'foldkit/brand'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
import { layoutPropDefs } from '../props/layout.props.js'
const sizes = ['1', '2', '3', '4'] as const
const displays = ['none', 'initial'] as const
const aligns = ['left', 'center', 'right'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const displayProp = responsiveProp({ className: 'rt-r-display', values: displays, classNames: { none: 'rt-r-display-none', initial: 'rt-r-display-flex' }, parseValue: value => value === 'initial' ? 'flex' : value })
const alignProp = responsiveProp({ className: 'rt-r-ai', values: aligns, classNames: { left: 'rt-r-ai-start', center: 'rt-r-ai-center', right: 'rt-r-ai-end' }, parseValue: value => value === 'left' ? 'start' : value === 'right' ? 'end' : value })
const layoutProps = {
  position: Schema.optional(responsiveSchema(['static', 'relative', 'absolute', 'fixed', 'sticky'])),
  inset: Schema.optional(responsiveSchema(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-1', '-2', '-3', '-4', '-5', '-6', '-7', '-8', '-9'], true)),
  top: Schema.optional(responsiveSchema(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-1', '-2', '-3', '-4', '-5', '-6', '-7', '-8', '-9'], true)),
  right: Schema.optional(responsiveSchema(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-1', '-2', '-3', '-4', '-5', '-6', '-7', '-8', '-9'], true)),
  bottom: Schema.optional(responsiveSchema(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-1', '-2', '-3', '-4', '-5', '-6', '-7', '-8', '-9'], true)),
  left: Schema.optional(responsiveSchema(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-1', '-2', '-3', '-4', '-5', '-6', '-7', '-8', '-9'], true)),
  overflow: Schema.optional(responsiveSchema(['visible', 'hidden', 'clip', 'scroll', 'auto'])),
  overflowX: Schema.optional(responsiveSchema(['visible', 'hidden', 'clip', 'scroll', 'auto'])),
  overflowY: Schema.optional(responsiveSchema(['visible', 'hidden', 'clip', 'scroll', 'auto'])),
  width: Schema.optional(responsiveSchema([], true)), minWidth: Schema.optional(responsiveSchema([], true)), maxWidth: Schema.optional(responsiveSchema([], true)),
  height: Schema.optional(responsiveSchema([], true)), minHeight: Schema.optional(responsiveSchema([], true)), maxHeight: Schema.optional(responsiveSchema([], true)),
  flexBasis: Schema.optional(responsiveSchema([], true)), flexShrink: Schema.optional(responsiveSchema(['0', '1'], true)), flexGrow: Schema.optional(responsiveSchema(['0', '1'], true)),
  gridArea: Schema.optional(responsiveSchema([], true)), gridColumn: Schema.optional(responsiveSchema([], true)),
  gridColumnStart: Schema.optional(responsiveSchema([], true)), gridColumnEnd: Schema.optional(responsiveSchema([], true)),
  gridRow: Schema.optional(responsiveSchema([], true)), gridRowStart: Schema.optional(responsiveSchema([], true)), gridRowEnd: Schema.optional(responsiveSchema([], true)),
  alignSelf: Schema.optional(responsiveSchema(['start', 'center', 'end', 'baseline', 'stretch'])),
  justifySelf: Schema.optional(responsiveSchema(['start', 'center', 'end', 'baseline', 'stretch'])),
}
const layoutPropTable = Object.freeze(Object.entries(layoutPropDefs).map(([key, definition]) => [key, responsiveProp({ className: definition.className, values: definition.values, customProperties: definition.customProperties, parseValue: definition.parseValue })] as const))
const innerLayoutProps = Object.freeze({ width: true, minWidth: true, maxWidth: true, height: true, minHeight: true, maxHeight: true })
export const Props = Schema.Struct({ size: Schema.optional(responsiveSchema(sizes)), display: Schema.optional(responsiveSchema(displays)), align: Schema.optional(responsiveSchema(aligns)), ...layoutProps, ...marginPropSchemas })
export type ViewProps = typeof Props.Type
export const view = <Message>(props: ViewProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const size = responsiveClasses(sizeProp, props.size ?? '4')
  const display = responsiveClasses(displayProp, props.display)
  const align = responsiveClasses(alignProp, props.align)
  const margin = marginClasses(props)
  const values = props as Readonly<Record<string, string | Readonly<Record<string, string>> | undefined>>
  const outerClasses = ['rt-Container', ...size.classes, ...display.classes, ...align.classes, ...margin.classes]
  const outerStyles: Record<string, string> = { ...size.style, ...display.style, ...align.style, ...margin.style }
  const innerClasses: string[] = ['rt-ContainerInner']
  const innerStyles: Record<string, string> = {}
  for (const [key, definition] of layoutPropTable) {
    const result = responsiveClasses(definition, values[key])
    if (key in innerLayoutProps) {
      innerClasses.push(...result.classes)
      Object.assign(innerStyles, result.style)
    } else {
      outerClasses.push(...result.classes)
      Object.assign(outerStyles, result.style)
    }
  }
  const innerAttributes: Attribute<Message>[] = [h.Class(innerClasses.join(' '))]
  if (Object.keys(innerStyles).length) innerAttributes.push(h.Style(innerStyles))
  const outerAttributes: Attribute<Message>[] = [h.Class(outerClasses.join(' '))]
  if (Object.keys(outerStyles).length) outerAttributes.push(h.Style(outerStyles))
  return brandViewResult(h.div(outerAttributes, [h.div(innerAttributes, children)]), 'wseffect/Container')
}
