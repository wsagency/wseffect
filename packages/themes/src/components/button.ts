import { brandViewResult } from 'foldkit/brand'
import { radii } from '../props/radius.props.js'
import { accentColors } from '../props/color.props.js'
import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as ButtonUi from '@foldkit/ui/button'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'

const sizes = ['1', '2', '3', '4'] as const
const variants = ['classic', 'solid', 'soft', 'surface', 'outline', 'ghost-offset', 'ghost'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const variantClasses = Object.freeze({
  classic: 'rt-variant-classic', solid: 'rt-variant-solid', soft: 'rt-variant-soft',
  surface: 'rt-variant-surface', outline: 'rt-variant-outline',
  'ghost-offset': 'rt-variant-ghost-offset', ghost: 'rt-variant-ghost',
})
const scalarButtonClasses = Object.freeze(Object.fromEntries(
  sizes.flatMap(size => variants.flatMap(variant => [false, true].flatMap(highContrast => [false, true].map(loading => [
    `${size}:${variant}:${highContrast}:${loading}`,
    ['rt-reset', 'rt-BaseButton', `rt-r-size-${size}`, variantClasses[variant], 'rt-Button', ...(highContrast ? ['rt-high-contrast'] : []), ...(loading ? ['rt-loading'] : [])].join(' '),
  ] as const)))),
))
const spinnerSizeProp = responsiveProp({
  className: 'rt-r-size',
  values: sizes,
  classNames: { '1': 'rt-r-size-1', '2': 'rt-r-size-2', '3': 'rt-r-size-2', '4': 'rt-r-size-3' },
})
const scalarSpinnerClasses = Object.freeze({
  '1': 'rt-Spinner rt-r-size-1',
  '2': 'rt-Spinner rt-r-size-2',
  '3': 'rt-Spinner rt-r-size-2',
  '4': 'rt-Spinner rt-r-size-3',
})

export const Props = Schema.Struct({
  size: Schema.optional(responsiveSchema(sizes)),
  variant: Schema.optional(Schema.Literals(variants)),
  color: Schema.optional(Schema.Literals(accentColors)),
  radius: Schema.optional(Schema.Literals(radii)),
  highContrast: Schema.optional(Schema.Boolean),
  disabled: Schema.optional(Schema.Boolean),
  loading: Schema.optional(Schema.Boolean),
  type: Schema.optional(Schema.Literals(['button', 'submit', 'reset'])),
})
export type ViewProps<Message> = typeof Props.Type & Readonly<{ onClick?: Message }>

export const view = <Message>(
  props: ViewProps<Message>,
  children: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Message>,
): Html => {
  const size = props.size ?? '2'
  const variant = props.variant ?? 'solid'
  const highContrast = props.highContrast ?? false
  const scalarSize = typeof size === 'string' ? size : undefined
  const classes = scalarSize === undefined
    ? ['rt-reset', 'rt-BaseButton', ...responsiveClasses(sizeProp, size).classes, variantClasses[variant], 'rt-Button', ...(highContrast ? ['rt-high-contrast'] : []), ...(props.loading ? ['rt-loading'] : [])].join(' ')
    : scalarButtonClasses[`${scalarSize}:${variant}:${highContrast}:${props.loading === true}`]
  const spinnerSizeClasses = typeof size === 'string'
    ? scalarSpinnerClasses[size as keyof typeof scalarSpinnerClasses]
    : ['rt-Spinner', ...responsiveClasses(spinnerSizeProp, { ...size, initial: size.initial ?? '2' }).classes].join(' ')
  return brandViewResult(ButtonUi.view({
    onClick: props.onClick,
    isDisabled: props.disabled ?? props.loading,
    type: props.type,
    toView: ({ button }) => {
      const attributes = [...button, h.Class(classes)]
      if (props.color !== undefined) attributes.push(h.DataAttribute('accent-color', props.color))
      if (props.radius !== undefined) attributes.push(h.DataAttribute('radius', props.radius))
      const content = h.span([h.Class('rt-ButtonContent'), h.Style({ display: 'contents' })], children)
      if (props.loading !== true) return h.button(attributes, [content])
      const spinner = h.span([h.Class(spinnerSizeClasses), h.AriaHidden(true)], [
        h.span([h.Class('rt-SpinnerLeaf')], []), h.span([h.Class('rt-SpinnerLeaf')], []),
        h.span([h.Class('rt-SpinnerLeaf')], []), h.span([h.Class('rt-SpinnerLeaf')], []),
        h.span([h.Class('rt-SpinnerLeaf')], []), h.span([h.Class('rt-SpinnerLeaf')], []),
        h.span([h.Class('rt-SpinnerLeaf')], []), h.span([h.Class('rt-SpinnerLeaf')], []),
      ])
      return h.button(attributes, [content, h.span([h.AriaHidden(true), h.Style({ position: 'absolute', inset: '0', display: 'flex', 'align-items': 'center', 'justify-content': 'center' })], [spinner])])
    },
  }, h), 'wseffect/Button')
}
