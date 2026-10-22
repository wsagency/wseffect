import { brandViewResult } from 'foldkit/brand'
import { Option, Schema } from 'effect'
import { defineView } from 'foldkit/submodel'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Update from 'foldkit/update'
import * as Listbox from '@foldkit/ui/listbox'
import * as SelectPosition from '@wsagency/wseffect-primitives/select-position'
import type { SelectConfig as PrimitiveConfig, SelectItem, SelectGroup, SelectSeparator } from '@wsagency/wseffect-primitives/select'
import * as SelectPrimitive from '@wsagency/wseffect-primitives/select'
import { accentColors } from '../props/color.props.js'
import { radii } from '../props/radius.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'

const sizes = ['1', '2', '3'] as const
const variants = ['classic', 'surface', 'soft', 'ghost-offset', 'ghost'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const variantClasses = Object.freeze({ classic: 'rt-variant-classic', surface: 'rt-variant-surface', soft: 'rt-variant-soft', 'ghost-offset': 'rt-variant-ghost-offset', ghost: 'rt-variant-ghost' })
export const Props = Schema.Struct({
  size: Schema.optional(responsiveSchema(sizes)),
  variant: Schema.optional(Schema.Literals(variants)),
  color: Schema.optional(Schema.Literals(accentColors)),
  radius: Schema.optional(Schema.Literals(radii)),
  highContrast: Schema.optional(Schema.Boolean),
  placeholder: Schema.optional(Schema.String),
})
export type Props = typeof Props.Type
export type Item<Value extends string> = SelectItem<Value>
export type Group<Value extends string> = SelectGroup<Value>
export type Separator = SelectSeparator
export type Config<Value extends string> = PrimitiveConfig<Value> & Readonly<{ props?: Props }>
export type Model = SelectPrimitive.SelectModel
export const Model = SelectPrimitive.SelectModel
export type Message = SelectPrimitive.SelectMessage
export const Message = SelectPrimitive.SelectMessage
export type OutMessage<Value extends string> = Listbox.OutMessage<Value>
export type Bundle<Value extends string> = Readonly<{
  Model: typeof Model
  Message: typeof Message
  OutMessage: typeof Listbox.OutMessage
  init(config: Config<Value>): Model
  update(model: Model, message: Message): Update.ReturnWithOutMessage<Model, Message, OutMessage<Value>>
  view(model: Model, config: Config<Value>, h: HtmlBuilder<Message>): Html
  fold<ParentModel, ParentMessage, ParentOutMessage>(config: Omit<Update.ChildFoldWithDerivedParentOutMessage<ParentModel, ParentMessage, Model, Message, Message, OutMessage<Value>, ParentOutMessage>, 'update'>): Update.FoldWithOutMessage<ParentModel, ParentMessage, Message, ParentOutMessage>
  embed<ParentMessage>(h: HtmlBuilder<ParentMessage>, config: Readonly<{ slotId: string; model: Model; toParentMessage(message: Message): ParentMessage; viewInputs: Config<Value> }>): Html
}>
export const create = <Value extends string>(): Bundle<Value> => {
  const adapter = SelectPrimitive.createSelect<Value>()
  const view = (model: Model, config: Config<Value>, h: HtmlBuilder<Message>): Html => {
    const size = config.props?.size ?? '2'
    const sizeClasses = typeof size === 'string' ? `rt-r-size-${size}` : responsiveClasses(sizeProp, size).classes.join(' ')
    const classes = ['rt-SelectRoot', sizeClasses, variantClasses[config.props?.variant ?? 'surface']].join(' ')
    if (config.position === 'popper') return brandViewResult(h.div([
      h.Class(classes),
      ...(config.props?.color === undefined ? [] : [h.DataAttribute('accent-color', config.props.color)]),
      ...(config.props?.radius === undefined ? [] : [h.DataAttribute('radius', config.props.radius)]),
    ], [adapter.view(model, config, h)]), 'wseffect/Select')
    const flatItems = config.items.flatMap(item => 'items' in item ? item.items : [item])
    const selectedValue = Option.isSome(config.selectedValue) ? config.selectedValue.value : undefined
    const selected = selectedValue === undefined ? undefined : flatItems.find((item): item is SelectItem<Value> => !('kind' in item) && item.value === selectedValue)
    return brandViewResult(h.div([
      h.Class(classes),
      ...(config.props?.color === undefined ? [] : [h.DataAttribute('accent-color', config.props.color)]),
      ...(config.props?.radius === undefined ? [] : [h.DataAttribute('radius', config.props.radius)]),
    ], [
      h.button([
        h.Id(`${config.id}-trigger`), h.Type('button'), h.Role('combobox'), h.AriaLabel(config.id), h.Attribute('aria-haspopup', 'listbox'),
        h.AriaExpanded(model.isOpen), h.OnClick(Message.Opened({ maybeActiveItemIndex: Option.none() })),
        h.Class(['rt-reset', 'rt-SelectTrigger', sizeClasses, variantClasses[config.props?.variant ?? 'surface']].join(' ')),
      ], [selected !== undefined ? selected.content : config.props?.placeholder ?? config.id]),
      ...(model.isOpen ? [h.div([
        h.Class(['rt-SelectContent', sizeClasses, 'rt-variant-solid', ...(config.props?.highContrast ? ['rt-high-contrast'] : [])].join(' ')),
        h.OnMount(SelectPosition.mountSelectPosition({
          panelId: `${config.id}-listbox`,
          triggerId: `${config.id}-trigger`,
          selectedItemId: `${config.id}-option-${selected?.value ?? ''}`,
          ...(Option.isSome(model.maybeActiveItemIndex) ? (() => {
            const active = flatItems[model.maybeActiveItemIndex.value]
            return active !== undefined && !('kind' in active) && !active.isDisabled ? { activeItemId: `${config.id}-option-${active.value}` } : {}
          })() : {}),
        })),
      ], [adapter.view(model, config, h)])] : []),
    ]), 'wseffect/Select')
  }
  const fold = <ParentModel, ParentMessage, ParentOutMessage>(config: Omit<Update.ChildFoldWithDerivedParentOutMessage<ParentModel, ParentMessage, Model, Message, Message, OutMessage<Value>, ParentOutMessage>, 'update'>): Update.FoldWithOutMessage<ParentModel, ParentMessage, Message, ParentOutMessage> => Update.foldChild({ ...config, update: adapter.update })
  const submodelView = defineView<Model, Message, Config<Value>>((model, inputs, builder) => view(model, inputs, builder))
  const embed = <ParentMessage>(h: HtmlBuilder<ParentMessage>, config: Readonly<{ slotId: string; model: Model; toParentMessage(message: Message): ParentMessage; viewInputs: Config<Value> }>): Html => h.submodel({ slotId: config.slotId, model: config.model, view: submodelView, viewInputs: config.viewInputs, toParentMessage: config.toParentMessage })
  return { Model, Message, OutMessage: Listbox.OutMessage, init: adapter.init, update: adapter.update, view, fold, embed }
}
