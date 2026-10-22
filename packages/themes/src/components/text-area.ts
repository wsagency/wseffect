import { brandViewResult } from 'foldkit/brand'
import { Schema } from 'effect'
import type { Html, HtmlBuilder, TextareaAttribute } from 'foldkit/html'
import * as TextareaUi from '@foldkit/ui/textarea'
import { accentColors } from '../props/color.props.js'
import { radii } from '../props/radius.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'

const sizes = ['1', '2', '3'] as const
const variants = ['classic', 'surface', 'soft'] as const
const resizeValues = ['none', 'vertical', 'horizontal', 'both'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const resizeProp = responsiveProp({ className: 'rt-r-resize', values: resizeValues })
const variantClasses = Object.freeze({ classic: 'rt-variant-classic', surface: 'rt-variant-surface', soft: 'rt-variant-soft' })
export const Props = Schema.Struct({
  id: Schema.String,
  label: Schema.optional(Schema.String),
  size: Schema.optional(responsiveSchema(sizes)),
  variant: Schema.optional(Schema.Literals(variants)),
  resize: Schema.optional(responsiveSchema(resizeValues)),
  color: Schema.optional(Schema.Literals(accentColors)),
  radius: Schema.optional(Schema.Literals(radii)),
  value: Schema.optional(Schema.String),
  defaultValue: Schema.optional(Schema.String),
  disabled: Schema.optional(Schema.Boolean),
  readOnly: Schema.optional(Schema.Boolean),
  invalid: Schema.optional(Schema.Boolean),
  autofocus: Schema.optional(Schema.Boolean),
  name: Schema.optional(Schema.String),
  required: Schema.optional(Schema.Boolean),
  rows: Schema.optional(Schema.Number),
  placeholder: Schema.optional(Schema.String),
})
export type Props = typeof Props.Type
export type ViewProps<Message> = Props & Readonly<{
  onInput?: (value: string) => Message
  /** Additional native textarea attributes and event handlers. The typed list supports Foldkit's full textarea attribute set and is forwarded directly to the `<textarea>`. */
  textareaAttributes?: ReadonlyArray<TextareaAttribute<Message>>
}>
export const view = <Message>(props: ViewProps<Message>, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const size = props.size ?? '2'
  const resize = props.resize
  const classes = [
    'rt-TextAreaRoot',
    ...(typeof size === 'string' ? [`rt-r-size-${size}`] : responsiveClasses(sizeProp, size).classes),
    variantClasses[props.variant ?? 'surface'],
    ...(resize === undefined ? [] : typeof resize === 'string' ? [`rt-r-resize-${resize}`] : responsiveClasses(resizeProp, resize).classes),
  ].join(' ')
  return brandViewResult(TextareaUi.view({
    id: props.id,
    value: props.value ?? props.defaultValue,
    onInput: props.onInput,
    isDisabled: props.disabled,
    isReadOnly: props.readOnly,
    isInvalid: props.invalid,
    isAutofocus: props.autofocus,
    rows: props.rows,
    placeholder: props.placeholder,
    hasDescription: children.length > 0,
    toView: attributes => h.div([
      h.Class(classes),
      ...(props.color === undefined ? [] : [h.DataAttribute('accent-color', props.color)]),
      ...(props.radius === undefined ? [] : [h.DataAttribute('radius', props.radius)]),
    ], [
      ...(props.label === undefined ? [] : [h.label([...attributes.label], [props.label])]),
      h.textarea([
        ...attributes.textarea,
        ...(props.name === undefined ? [] : [h.Name(props.name)]),
        ...(props.required ? [h.Attribute('required', '')] : []),
        ...(props.textareaAttributes ?? []),
        h.Class('rt-reset rt-TextAreaInput'),
      ]),
      ...(children.length > 0 ? [h.p([...attributes.description], children)] : []),
    ]),
  }, h), 'wseffect/TextArea')
}
