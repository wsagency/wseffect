import { brandViewResult } from 'foldkit/brand'
import { childAttributes, type Html, type HtmlBuilder } from 'foldkit/html'
import * as Update from 'foldkit/update'
import { defineView } from 'foldkit/submodel'
import { Schema } from 'effect'
import * as RadioGroupUi from '@foldkit/ui/radioGroup'
import type { ViewInputs as UiInputs } from '@foldkit/ui/radioGroup'
import { accentColors } from '../props/color.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'

const sizes = ['1', '2', '3'] as const
const variants = ['classic', 'surface', 'soft'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const variantClasses = Object.freeze({ classic: 'rt-variant-classic', surface: 'rt-variant-surface', soft: 'rt-variant-soft' })
export const Props = Schema.Struct({
  size: Schema.optional(responsiveSchema(sizes)),
  variant: Schema.optional(Schema.Literals(variants)),
  color: Schema.optional(Schema.Literals(accentColors)),
  highContrast: Schema.optional(Schema.Boolean),
})
export type Props = typeof Props.Type
export type Model = RadioGroupUi.Model
export type Message = RadioGroupUi.Message
export type OutMessage<Value extends string> = RadioGroupUi.OutMessage<Value>
export type Option<Value extends string> = Readonly<{ value: Value; label?: Html; isDisabled?: boolean }>
export type ViewInputs<Value extends string> = Omit<UiInputs<Value>, 'toView' | 'options' | 'isOptionDisabled'> & Readonly<{ options: ReadonlyArray<Option<Value>>; optionToLabel?: (value: Value) => Html; props?: Props & { rootClass?: string } }>
export type EmbedConfig<Value extends string, ParentMessage> = Readonly<{ slotId: string; model: Model; toParentMessage(message: Message): ParentMessage; viewInputs: ViewInputs<Value> }>
export type Bundle<Value extends string> = Readonly<{
  Model: typeof RadioGroupUi.Model
  Message: typeof RadioGroupUi.Message
  OutMessage: typeof RadioGroupUi.OutMessage
  init: typeof RadioGroupUi.init
  update: (model: Model, message: Message) => Update.ReturnWithOutMessage<Model, Message, OutMessage<Value>>
  view(model: Model, inputs: ViewInputs<Value>, h: HtmlBuilder<Message>): Html
  fold<ParentModel, ParentMessage, ParentOutMessage>(config: Omit<Update.ChildFoldWithDerivedParentOutMessage<ParentModel, ParentMessage, Model, Message, Message, OutMessage<Value>, ParentOutMessage>, 'update'>): Update.FoldWithOutMessage<ParentModel, ParentMessage, Message, ParentOutMessage>
  embed<ParentMessage>(h: HtmlBuilder<ParentMessage>, config: EmbedConfig<Value, ParentMessage>): Html
}>
export const create = <Value extends string>(): Bundle<Value> => {
  const group = RadioGroupUi.create<Value>()
  const view = defineView<Model, Message, ViewInputs<Value>>((model, inputs, h) => {
    const props = inputs.props ?? {}
    const size = props.size ?? '2'
    const classes = typeof size === 'string' ? `rt-r-size-${size}` : responsiveClasses(sizeProp, size).classes.join(' ')
    return brandViewResult(group.view(model, {
      options: inputs.options.map(option => option.value),
      selectedValue: inputs.selectedValue,
      ariaLabel: inputs.ariaLabel,
      orientation: inputs.orientation,
      isOptionDisabled: (_value, index) => inputs.options[index]?.isDisabled ?? false,
      isDisabled: inputs.isDisabled,
      isReadOnly: inputs.isReadOnly,
      name: inputs.name,
      toView: render => h.div([...render.group, ...childAttributes([h.Class(['rt-RadioGroupRoot', props.rootClass, classes, variantClasses[props.variant ?? 'surface']].filter(Boolean).join(' '))])], render.options.map((option, index) => {
        const labelId = `${model.id}-option-${index}-label`
        const optionLabel = inputs.optionToLabel?.(option.value) ?? inputs.options[index]?.label ?? ''
        return h.label([...childAttributes([h.Class('rt-RadioGroupItem')])], [
          h.button([...option.option, h.AriaLabelledBy(labelId), ...childAttributes([h.Class('rt-reset rt-BaseRadioRoot')])], []),
          h.span([h.Id(labelId), ...childAttributes([h.Class('rt-RadioGroupItemInner')])], [optionLabel]),
        ])
      })),
    }, h), 'wseffect/RadioGroup')
  })
  const fold = <ParentModel, ParentMessage, ParentOutMessage>(config: Omit<Update.ChildFoldWithDerivedParentOutMessage<ParentModel, ParentMessage, Model, Message, Message, OutMessage<Value>, ParentOutMessage>, 'update'>): Update.FoldWithOutMessage<ParentModel, ParentMessage, Message, ParentOutMessage> => Update.foldChild({ ...config, update: group.update })
  const embed = <ParentMessage>(h: HtmlBuilder<ParentMessage>, config: EmbedConfig<Value, ParentMessage>): Html => h.submodel({ slotId: config.slotId, model: config.model, view, viewInputs: config.viewInputs, toParentMessage: config.toParentMessage })
  return { Model: RadioGroupUi.Model, Message: RadioGroupUi.Message, OutMessage: RadioGroupUi.OutMessage, init: RadioGroupUi.init, update: group.update, view, fold, embed }
}
