import { brandViewResult } from 'foldkit/brand'
import { radii } from '../props/radius.props.js'
import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import * as InputUi from '@foldkit/ui/input'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'

const sizes = ['1', '2', '3'] as const
const variants = ['classic', 'surface', 'soft'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const variantClasses = Object.freeze({
  classic: 'rt-variant-classic', surface: 'rt-variant-surface', soft: 'rt-variant-soft',
})
const scalarTextFieldClasses = Object.freeze(Object.fromEntries(
  sizes.flatMap(size => variants.map(variant => [`${size}:${variant}`, `rt-TextFieldRoot rt-r-size-${size} ${variantClasses[variant]}`] as const)),
))

export const Props = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  size: Schema.optional(responsiveSchema(sizes)),
  variant: Schema.optional(Schema.Literals(variants)),
  radius: Schema.optional(Schema.Literals(radii)),
  value: Schema.optional(Schema.String),
  placeholder: Schema.optional(Schema.String),
  type: Schema.optional(Schema.String),
  disabled: Schema.optional(Schema.Boolean),
  readOnly: Schema.optional(Schema.Boolean),
  invalid: Schema.optional(Schema.Boolean),
  color: Schema.optional(Schema.String),
})
export type ViewProps<Message> = typeof Props.Type & Readonly<{ onInput?: (value: string) => Message }>

export const view = <Message>(
  props: ViewProps<Message>,
  children: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Message>,
): Html => {
  const size = props.size ?? '2'
  const variant = props.variant ?? 'surface'
  const rootClasses = typeof size === 'string'
    ? scalarTextFieldClasses[`${size}:${variant}`]
    : ['rt-TextFieldRoot', ...responsiveClasses(sizeProp, size).classes, variantClasses[variant]].join(' ')
  const sizeStyle = typeof size === 'string' ? {} : responsiveClasses(sizeProp, size).style
  return InputUi.view({
    id: props.id,
    value: props.value,
    onInput: props.onInput,
    isDisabled: props.disabled,
    isReadOnly: props.readOnly,
    isInvalid: props.invalid,
    type: props.type,
    placeholder: props.placeholder,
    toView: ({ input, label, description }) => {
      const attributes: Attribute<Message>[] = [h.Class(rootClasses), ...(Object.keys(sizeStyle).length > 0 ? [h.Style(sizeStyle)] : [])]
      if (props.color !== undefined) attributes.push(h.DataAttribute('accent-color', props.color))
      if (props.radius !== undefined) attributes.push(h.DataAttribute('radius', props.radius))
      return h.div(attributes, [
        brandViewResult(h.label([...label, h.Class('rt-TextFieldLabel')], [props.label]), 'wseffect/TextFieldLabel'),
        h.input([...input, h.Class('rt-reset rt-TextFieldInput')]),
        ...(children.length > 0 ? [h.p([...description, h.Class('rt-TextFieldDescription')], children)] : []),
      ])
    },
  }, h)
}
