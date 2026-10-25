import { Schema } from 'effect'
import { brandViewResult } from '@wsagency/wseffect-foldkit/brand'
import type { Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as UiNav from '@wsagency/wseffect-foldkit-ui/nav'
import { accentColors } from '../props/color.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'

const sizes = ['1', '2'] as const
const wraps = ['nowrap', 'wrap', 'wrap-reverse'] as const
const justifies = ['start', 'center', 'end'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const wrapProp = responsiveProp({ className: 'rt-r-fw', values: wraps })
const justifyProp = responsiveProp({ className: 'rt-r-jc', values: justifies })

export const Props = Schema.Struct({
  items: Schema.Array(Schema.Struct({ value: Schema.String, href: Schema.String, label: Schema.String })),
  currentValue: Schema.String,
  ariaLabel: Schema.String,
  size: Schema.optional(responsiveSchema(sizes)),
  wrap: Schema.optional(responsiveSchema(wraps)),
  justify: Schema.optional(responsiveSchema(justifies)),
  color: Schema.optional(Schema.Literals(accentColors)),
  highContrast: Schema.optional(Schema.Boolean),
})
export type Props = typeof Props.Type

const itemClass = 'rt-reset rt-BaseTabListTrigger rt-TabNavLink'

export const view = <Message>(props: Props, _children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const itemByValue = new Map(props.items.map(item => [item.value, item]))
  const sizeClasses = props.size === undefined ? ['rt-r-size-2'] : responsiveClasses(sizeProp, props.size).classes
  const wrapClasses = props.wrap === undefined ? [] : responsiveClasses(wrapProp, props.wrap).classes
  const justifyClasses = props.justify === undefined ? [] : responsiveClasses(justifyProp, props.justify).classes
  const listClass = ['rt-reset', 'rt-BaseTabList', 'rt-TabsList', ...sizeClasses, ...wrapClasses, ...justifyClasses, ...(props.highContrast ? ['rt-high-contrast'] : [])].join(' ')
  const rendered = UiNav.view({
    items: props.items.map(item => item.value),
    ariaLabel: props.ariaLabel,
    toHref: value => itemByValue.get(value)?.href ?? '',
    isItemCurrent: value => value === props.currentValue,
    toView: render => h.nav([...render.nav, h.Class('rt-TabsRoot'), ...(props.color === undefined ? [] : [h.DataAttribute('accent-color', props.color)])], [
      h.div([h.Class(listClass)], render.items.map(item => {
        const data = itemByValue.get(item.value)
        const label = data?.label ?? item.value
        const isCurrent = item.value === props.currentValue
        return h.div([h.Class('rt-TabNavItem')], [h.a([
          ...item.link,
          h.Class(itemClass),
          ...(isCurrent ? [h.DataAttribute('active', '')] : []),
        ], [
          h.span([h.Class('rt-BaseTabListTriggerInner')], [label]),
          h.span([h.Class('rt-BaseTabListTriggerInnerHidden')], [label]),
        ])])
      })),
    ]),
  })
  return brandViewResult(rendered, 'wseffect/TabNav')
}
