import { brandViewResult } from '@wsagency/wseffect-foldkit/brand'
import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
import { paddingClasses, paddingPropSchemas } from '../props/padding.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import * as ScrollArea from './scroll-area.js'
const sizes = ['1', '2', '3'] as const
const variants = ['surface', 'ghost'] as const
const layouts = ['auto', 'fixed'] as const
const alignments = ['start', 'center', 'end', 'baseline'] as const
const justifications = ['start', 'center', 'end'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const layoutProp = responsiveProp({ className: 'rt-r-tl', values: layouts })
const alignProp = responsiveProp({ className: 'rt-r-va', values: alignments, classNames: { start: 'rt-r-va-top', center: 'rt-r-va-middle', end: 'rt-r-va-bottom', baseline: 'rt-r-va-baseline' } })
const justifyProp = responsiveProp({ className: 'rt-r-ta', values: justifications, classNames: { start: 'rt-r-ta-left', center: 'rt-r-ta-center', end: 'rt-r-ta-right' } })
const widthProp = responsiveProp({ className: 'rt-r-w', customProperties: ['--width'] })
const minWidthProp = responsiveProp({ className: 'rt-r-min-w', customProperties: ['--min-width'] })
const maxWidthProp = responsiveProp({ className: 'rt-r-max-w', customProperties: ['--max-width'] })
const rootProps = Schema.Struct({ size: Schema.optional(responsiveSchema(sizes)), variant: Schema.optional(Schema.Literals(variants)), layout: Schema.optional(responsiveSchema(layouts)), ...marginPropSchemas })
const alignProps = Schema.Struct({ align: Schema.optional(responsiveSchema(alignments)) })
const cellProps = Schema.Struct({ justify: Schema.optional(responsiveSchema(justifications)), width: Schema.optional(responsiveSchema([], true)), minWidth: Schema.optional(responsiveSchema([], true)), maxWidth: Schema.optional(responsiveSchema([], true)), ...paddingPropSchemas })
const emptyProps = Schema.Struct({})
const parts = (base: string, extras: ReadonlyArray<string>) => [base, ...extras].join(' ')
export const Root = { Props: rootProps, view: <M>(props: typeof rootProps.Type, children: ReadonlyArray<Html | string>, h: HtmlBuilder<M>): Html => { const sizeValue = typeof props.size === 'object' ? { ...props.size, initial: props.size.initial ?? '2' } : props.size ?? '2'; const size = responsiveClasses(sizeProp, sizeValue); const layout = responsiveClasses(layoutProp, props.layout); const margin = marginClasses(props); const attrs: Attribute<M>[] = [h.Class(parts('rt-TableRoot', [...size.classes, `rt-variant-${props.variant ?? 'ghost'}`, ...margin.classes]))]; const style = { ...size.style, ...margin.style }; if (Object.keys(style).length) attrs.push(h.Style(style)); const tableAttrs: Attribute<M>[] = [h.Class(parts('rt-TableRootTable', layout.classes))]; if (Object.keys(layout.style).length) tableAttrs.push(h.Style(layout.style)); return brandViewResult(h.div(attrs, [ScrollArea.view({ scrollbars: 'both' }, [h.table(tableAttrs, children)], h)]), 'wseffect/Table.Root') } }
export const Header = { Props: emptyProps, view: <M>(_props: typeof emptyProps.Type, children: ReadonlyArray<Html | string>, h: HtmlBuilder<M>): Html => brandViewResult(h.thead([h.Class('rt-TableHeader')], children), 'wseffect/Table.Header') }
export const Body = { Props: emptyProps, view: <M>(_props: typeof emptyProps.Type, children: ReadonlyArray<Html | string>, h: HtmlBuilder<M>): Html => brandViewResult(h.tbody([h.Class('rt-TableBody')], children), 'wseffect/Table.Body') }
export const Row = { Props: alignProps, view: <M>(props: typeof alignProps.Type, children: ReadonlyArray<Html | string>, h: HtmlBuilder<M>): Html => { const align = responsiveClasses(alignProp, props.align); const attrs: Attribute<M>[] = [h.Class(parts('rt-TableRow', align.classes))]; if (Object.keys(align.style).length) attrs.push(h.Style(align.style)); return brandViewResult(h.tr(attrs, children), 'wseffect/Table.Row') } }
const cellAttributes = <M>(props: typeof cellProps.Type, extra: string, h: HtmlBuilder<M>) => {
  const justify = responsiveClasses(justifyProp, props.justify)
  const width = responsiveClasses(widthProp, props.width)
  const minWidth = responsiveClasses(minWidthProp, props.minWidth)
  const maxWidth = responsiveClasses(maxWidthProp, props.maxWidth)
  const padding = paddingClasses(props)
  const attrs: Attribute<M>[] = [h.Class(parts(`rt-TableCell${extra}`, [...justify.classes, ...width.classes, ...minWidth.classes, ...maxWidth.classes, ...padding.classes]))]
  const style = { ...justify.style, ...width.style, ...minWidth.style, ...maxWidth.style, ...padding.style }
  if (Object.keys(style).length) attrs.push(h.Style(style))
  return attrs
}
export const Cell = { Props: cellProps, view: <M>(props: typeof cellProps.Type, children: ReadonlyArray<Html | string>, h: HtmlBuilder<M>): Html => brandViewResult(h.td(cellAttributes(props, '', h), children), 'wseffect/Table.Cell') }
export const ColumnHeaderCell = { Props: cellProps, view: <M>(props: typeof cellProps.Type, children: ReadonlyArray<Html | string>, h: HtmlBuilder<M>): Html => brandViewResult(h.th([h.Attribute('scope', 'col'), ...cellAttributes(props, ' rt-TableColumnHeaderCell', h)], children), 'wseffect/Table.ColumnHeaderCell') }
export const RowHeaderCell = { Props: cellProps, view: <M>(props: typeof cellProps.Type, children: ReadonlyArray<Html | string>, h: HtmlBuilder<M>): Html => brandViewResult(h.th([h.Attribute('scope', 'row'), ...cellAttributes(props, ' rt-TableRowHeaderCell', h)], children), 'wseffect/Table.RowHeaderCell') }
