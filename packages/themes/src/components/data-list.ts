import { brandViewResult } from 'foldkit/brand'
import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { accentColors } from '../props/color.props.js'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
const orientations = ['horizontal', 'vertical'] as const
const sizes = ['1', '2', '3'] as const
const alignments = ['start', 'center', 'end', 'baseline', 'stretch'] as const
const trims = ['normal', 'start', 'end', 'both'] as const
const orientationProp = responsiveProp({ className: 'rt-r-orientation', values: orientations })
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const trimProp = responsiveProp({ className: 'rt-r-trim', values: trims })
const alignProp = responsiveProp({ className: 'rt-r-ai', values: alignments })
const widthProp = responsiveProp({ className: 'rt-r-w', customProperties: ['--width'] })
const minWidthProp = responsiveProp({ className: 'rt-r-min-w', customProperties: ['--min-width'] })
const maxWidthProp = responsiveProp({ className: 'rt-r-max-w', customProperties: ['--max-width'] })
const rootProps = Schema.Struct({ orientation: Schema.optional(responsiveSchema(orientations)), size: Schema.optional(responsiveSchema(sizes)), trim: Schema.optional(responsiveSchema(trims)), ...marginPropSchemas })
const itemProps = Schema.Struct({ align: Schema.optional(responsiveSchema(alignments)) })
const labelProps = Schema.Struct({ width: Schema.optional(responsiveSchema([], true)), minWidth: Schema.optional(responsiveSchema([], true)), maxWidth: Schema.optional(responsiveSchema([], true)), color: Schema.optional(Schema.Literals(accentColors)), highContrast: Schema.optional(Schema.Boolean) })
const emptyProps = Schema.Struct({})
const classes = (base: string, extras: ReadonlyArray<string>) => [base, ...extras].join(' ')
export const Root = { Props: rootProps, view: <M>(props: typeof rootProps.Type, children: ReadonlyArray<Html | string>, h: HtmlBuilder<M>): Html => { const margin = marginClasses(props); const orientationValue = typeof props.orientation === 'object' ? { ...props.orientation, initial: props.orientation.initial ?? 'horizontal' } : props.orientation ?? 'horizontal'; const sizeValue = typeof props.size === 'object' ? { ...props.size, initial: props.size.initial ?? '2' } : props.size ?? '2'; const orientation = responsiveClasses(orientationProp, orientationValue); const size = responsiveClasses(sizeProp, sizeValue); const trim = responsiveClasses(trimProp, props.trim); const attrs: Attribute<M>[] = [h.Class(classes('rt-reset rt-Text rt-DataListRoot', [...orientation.classes, ...size.classes, ...trim.classes, ...margin.classes]))]; const style = { ...orientation.style, ...size.style, ...trim.style, ...margin.style }; if (Object.keys(style).length) attrs.push(h.Style(style)); return brandViewResult(h.dl(attrs, children), 'wseffect/DataList.Root') } }
export const Item = { Props: itemProps, view: <M>(props: typeof itemProps.Type, children: ReadonlyArray<Html | string>, h: HtmlBuilder<M>): Html => { const align = responsiveClasses(alignProp, props.align); const attrs: Attribute<M>[] = [h.Class(classes('rt-DataListItem', align.classes))]; if (Object.keys(align.style).length) attrs.push(h.Style(align.style)); return brandViewResult(h.div(attrs, children), 'wseffect/DataList.Item') } }
export const Label = { Props: labelProps, view: <M>(props: typeof labelProps.Type, children: ReadonlyArray<Html | string>, h: HtmlBuilder<M>): Html => { const width = responsiveClasses(widthProp, props.width); const minWidth = responsiveClasses(minWidthProp, props.minWidth); const maxWidth = responsiveClasses(maxWidthProp, props.maxWidth); const attrs: Attribute<M>[] = [h.Class(classes('rt-DataListLabel', [...width.classes, ...minWidth.classes, ...maxWidth.classes, ...(props.highContrast ? ['rt-high-contrast'] : [])]))]; if (props.color !== undefined) attrs.push(h.DataAttribute('accent-color', props.color)); const style = { ...width.style, ...minWidth.style, ...maxWidth.style }; if (Object.keys(style).length) attrs.push(h.Style(style)); return brandViewResult(h.dt(attrs, children), 'wseffect/DataList.Label') } }
export const Value = { Props: emptyProps, view: <M>(_props: typeof emptyProps.Type, children: ReadonlyArray<Html | string>, h: HtmlBuilder<M>): Html => brandViewResult(h.dd([h.Class('rt-DataListValue')], children), 'wseffect/DataList.Value') }
