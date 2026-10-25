import { brandViewResult } from '@wsagency/wseffect-foldkit/brand'
import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { accentColors } from '../props/color.props.js'
import { radii } from '../props/radius.props.js'
import { marginClasses, marginPropSchemas } from '../props/margin.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import { mountAvatarImage } from './avatar.mount.js'
const sizes = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const variants = ['solid', 'soft'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const variantClasses = Object.freeze({ solid: 'rt-variant-solid', soft: 'rt-variant-soft' })
export const Props = Schema.Struct({ src: Schema.optional(Schema.String), alt: Schema.optional(Schema.String), fallback: Schema.Unknown, size: Schema.optional(responsiveSchema(sizes)), variant: Schema.optional(Schema.Literals(variants)), color: Schema.optional(Schema.Literals(accentColors)), highContrast: Schema.optional(Schema.Boolean), radius: Schema.optional(Schema.Literals(radii)), ...marginPropSchemas })
export type ViewProps = Omit<typeof Props.Type, 'fallback'> & Readonly<{ fallback: Html | string }>
export const view = <Message>(props: ViewProps, _children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const sizeValue = typeof props.size === 'object' ? { ...props.size, initial: props.size.initial ?? '3' } : props.size ?? '3'
  const size = responsiveClasses(sizeProp, sizeValue)
  const margin = marginClasses(props)
  const classes = ['rt-reset', 'rt-AvatarRoot', ...size.classes, variantClasses[props.variant ?? 'soft'], ...(props.highContrast ? ['rt-high-contrast'] : []), ...margin.classes]
  const attrs: Attribute<Message>[] = [h.Class(classes.join(' '))]
  attrs.push(h.DataAttribute('accent-color', props.color ?? ''))
  if (props.radius !== undefined) attrs.push(h.DataAttribute('radius', props.radius))
  if (Object.keys({ ...size.style, ...margin.style }).length) attrs.push(h.Style({ ...size.style, ...margin.style }))
  const fallback = typeof props.fallback === 'string' && props.fallback.length === 1
    ? 'rt-one-letter'
    : typeof props.fallback === 'string' && props.fallback.length === 2 ? 'rt-two-letters' : undefined
  const content: Html[] = props.src === undefined || props.src.length === 0
    ? [h.span([h.Class(['rt-AvatarFallback', fallback].filter(Boolean).join(' '))], [props.fallback])]
    : [
      h.span([h.Class('rt-AvatarFallback')], []),
      h.span([h.Class(['rt-AvatarFallback', fallback].filter(Boolean).join(' ')), h.Attribute('hidden', '')], [props.fallback]),
      h.img([h.Class('rt-AvatarImage'), h.Attribute('src', props.src), h.Attribute('alt', props.alt ?? ''), h.OnMount(mountAvatarImage())]),
    ]
  return brandViewResult(h.span(attrs, content), 'wseffect/Avatar')
}
