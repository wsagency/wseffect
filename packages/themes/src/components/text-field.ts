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

export const Props = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  size: Schema.optional(responsiveSchema(sizes)),
  variant: Schema.optional(Schema.Literals(variants)),
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
  const size = responsiveClasses(sizeProp, props.size ?? '2')
  const rootClasses = ['rt-TextFieldRoot', ...size.classes, variantClasses[props.variant ?? 'surface']]
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
      const attributes: Attribute<Message>[] = [h.Class(rootClasses.join(' ')), ...(Object.keys(size.style).length > 0 ? [h.Style(size.style)] : [])]
      if (props.color !== undefined) attributes.push(h.DataAttribute('accent-color', props.color))
      return h.div(attributes, [
        h.label([...label, h.Class('rt-TextFieldLabel')], [props.label]),
        h.input([...input, h.Class('rt-reset rt-TextFieldInput')]),
        ...(children.length > 0 ? [h.p([...description, h.Class('rt-TextFieldDescription')], children)] : []),
      ])
    },
  }, h)
}
