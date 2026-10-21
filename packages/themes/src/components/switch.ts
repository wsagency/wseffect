import { brandViewResult } from 'foldkit/brand'
import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as SwitchUi from '@foldkit/ui/switch'
import { accentColors } from '../props/color.props.js'
import { responsiveSchema } from '../props/componentSchema.js'

const sizes = ['1', '2', '3'] as const
const variants = ['classic', 'surface', 'soft'] as const
const variantClasses = Object.freeze({ classic: 'rt-variant-classic', surface: 'rt-variant-surface', soft: 'rt-variant-soft' })
export const Props = Schema.Struct({
  id: Schema.String,
  size: Schema.optional(responsiveSchema(sizes)),
  variant: Schema.optional(Schema.Literals(variants)),
  color: Schema.optional(Schema.Literals(accentColors)),
  highContrast: Schema.optional(Schema.Boolean),
  checked: Schema.optional(Schema.Boolean),
  defaultChecked: Schema.optional(Schema.Boolean),
  disabled: Schema.optional(Schema.Boolean),
  readOnly: Schema.optional(Schema.Boolean),
  name: Schema.optional(Schema.String),
  value: Schema.optional(Schema.String),
  onCheckedChange: Schema.optional(Schema.declare((input): input is (checked: boolean) => unknown => typeof input === 'function')),
})
export type Props = typeof Props.Type
export const view = <Message>(props: Props & { onCheckedChange?: (checked: boolean) => Message }, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => brandViewResult(SwitchUi.view({
  id: props.id,
  isChecked: props.checked ?? props.defaultChecked ?? false,
  isDisabled: props.disabled,
  isReadOnly: props.readOnly,
  name: props.name,
  value: props.value,
  onToggle: checked => props.onCheckedChange?.(checked) as Message,
  toView: attributes => h.div([], [
    h.button([
      ...attributes.button,
      h.Class(['rt-reset', 'rt-SwitchRoot', `rt-r-size-${props.size ?? '2'}`, variantClasses[props.variant ?? 'surface']].join(' ')),
      ...(props.color === undefined ? [] : [h.DataAttribute('accent-color', props.color)]),
    ], [h.span([h.Class('rt-SwitchThumb'), h.AriaHidden(true)], [])]),
    h.label([...attributes.label, h.Class('rt-SwitchLabel')], children),
    ...(attributes.hiddenInput.length === 0 ? [] : [h.input([...attributes.hiddenInput])]),
  ]),
}, h), 'wseffect/Switch')
