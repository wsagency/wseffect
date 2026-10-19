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
const spinnerClasses = Object.freeze({ '1': 'rt-r-size-2', '2': 'rt-r-size-3', '3': 'rt-r-size-4', '4': 'rt-r-size-5' })

export const Props = Schema.Struct({
  size: Schema.optional(responsiveSchema(sizes)),
  variant: Schema.optional(Schema.Literals(variants)),
  color: Schema.optional(Schema.String),
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
  const sizeClasses = responsiveClasses(sizeProp, size)
  const sizeScalar = typeof size === 'string' ? size : size.initial ?? size.md ?? '2'
  return ButtonUi.view({
    onClick: props.onClick,
    isDisabled: props.disabled,
    type: props.type,
    toView: ({ button }) => {
      const classes = ['rt-reset', 'rt-BaseButton', ...sizeClasses.classes, variantClasses[props.variant ?? 'solid'], 'rt-Button']
      const attributes = [...button, h.Class(classes.join(' '))]
      if (props.color !== undefined) attributes.push(h.DataAttribute('accent-color', props.color))
      const label = h.span([h.Class('rt-ButtonLabel')], children)
      if (props.loading !== true) return h.button(attributes, [label])
      const spinner = h.span([h.Class('rt-Spinner rt-ButtonSpinner'), h.AriaHidden(true)], [
        h.span([h.Class('rt-SpinnerLeaf')], []), h.span([h.Class('rt-SpinnerLeaf')], []),
        h.span([h.Class('rt-SpinnerLeaf')], []), h.span([h.Class('rt-SpinnerLeaf')], []),
        h.span([h.Class('rt-SpinnerLeaf')], []), h.span([h.Class('rt-SpinnerLeaf')], []),
        h.span([h.Class('rt-SpinnerLeaf')], []), h.span([h.Class('rt-SpinnerLeaf')], []),
      ])
      return h.button(attributes, [label, h.span([h.Class('rt-ButtonLoading'), h.AriaHidden(true), h.Style({ position: 'absolute', inset: '0', display: 'flex', 'align-items': 'center', 'justify-content': 'center' })], [
        h.span([h.Class(spinnerClasses[sizeScalar as keyof typeof spinnerClasses] ?? spinnerClasses['2'])], [spinner]),
      ])])
    },
  }, h)
}
