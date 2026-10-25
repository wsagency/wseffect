import { brandViewResult } from '@wsagency/wseffect-foldkit/brand'
import { Option, Schema } from 'effect'
import { defineView } from '@wsagency/wseffect-foldkit/submodel'
import type { Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Update from '@wsagency/wseffect-foldkit/update'
import * as Listbox from '@wsagency/wseffect-foldkit-ui/listbox'
import * as SelectPosition from '@wsagency/wseffect-primitives/select-position'
import type { SelectConfig as PrimitiveConfig, SelectItem, SelectGroup, SelectSeparator } from '@wsagency/wseffect-primitives/select'
import * as SelectPrimitive from '@wsagency/wseffect-primitives/select'
import { accentColors } from '../props/color.props.js'
import { radii } from '../props/radius.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import { defaults } from './themeAttributes.js'
import { chevronDownIcon, thickCheckIcon } from './icons.js'
import { mountScrollArea } from './scroll-area.mount.js'
type SelectScrollNode = { key: PropertyKey | undefined; children: Array<SelectScrollNode | string> | undefined }

const sizes = ['1', '2', '3'] as const
const variants = ['classic', 'surface', 'soft', 'ghost-offset', 'ghost'] as const
const contentVariants = ['solid', 'soft'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const variantClasses = Object.freeze({ classic: 'rt-variant-classic', surface: 'rt-variant-surface', soft: 'rt-variant-soft', 'ghost-offset': 'rt-variant-ghost-offset', ghost: 'rt-variant-ghost' })
const contentVariantClasses = Object.freeze({ solid: 'rt-variant-solid', soft: 'rt-variant-soft' })
export const Props = Schema.Struct({
  size: Schema.optional(responsiveSchema(sizes)),
  variant: Schema.optional(Schema.Literals(variants)),
  contentVariant: Schema.optional(Schema.Literals(contentVariants)),
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
  const addPopperScrollArea = (tree: Html, id: string, h: HtmlBuilder<Message>): Html => {
    if (tree === null) return tree
    const visit = (node: SelectScrollNode): boolean => {
      if (node.key === `${id}-items-container`) {
        const viewport = node.children?.[0]
        if (viewport === undefined) return false
        node.children = [h.div([
          h.Class('rt-ScrollAreaRoot'),
          h.Style({ position: 'relative' }),
          h.OnMount(mountScrollArea()),
        ], [
          viewport as unknown as Html,
          h.div([
            h.DataAttribute('orientation', 'vertical'),
            h.DataAttribute('state', 'hidden'),
            h.Attribute('aria-hidden', 'true'),
            h.Class('rt-ScrollAreaScrollbar rt-r-size-1'),
            h.Style({ top: '0', bottom: '0', right: '0' }),
          ], [
            h.div([h.Class('rt-ScrollAreaThumb')], []),
          ]),
        ])! as unknown as SelectScrollNode]
        return true
      }
      for (const child of node.children ?? []) {
        if (typeof child !== 'string' && visit(child)) return true
      }
      return false
    }
    visit(tree as unknown as SelectScrollNode)
    return tree
  }
  const view = (model: Model, config: Config<Value>, h: HtmlBuilder<Message>): Html => {
    const size = config.props?.size ?? '2'
    const sizeClasses = typeof size === 'string' ? `rt-r-size-${size}` : responsiveClasses(sizeProp, size).classes.join(' ')
    const triggerVariant = variantClasses[config.props?.variant ?? 'surface']
    const contentVariant = contentVariantClasses[config.props?.contentVariant ?? 'solid']
    const highContrast = config.props?.highContrast === true
    const appearance = {
      triggerClassName: ['rt-reset', 'rt-SelectTrigger', sizeClasses, triggerVariant].join(' '),
      contentClassName: [
        ...(config.position === 'popper' ? ['rt-PopperContent'] : []),
        'rt-SelectContent',
        sizeClasses,
        contentVariant,
        ...(highContrast ? ['rt-high-contrast'] : []),
      ].join(' '),
      itemClassName: 'rt-SelectItem',
      groupClassName: 'rt-SelectGroup',
      labelClassName: 'rt-SelectLabel',
      separatorClassName: 'rt-SelectSeparator',
      itemsScrollClassName: 'rt-SelectViewport rt-ScrollAreaViewport',
      scrollAreaClassName: 'rt-ScrollAreaRoot',
      scrollbarClassName: 'rt-ScrollAreaScrollbar rt-r-size-1',
      scrollThumbClassName: 'rt-ScrollAreaThumb',
      itemContentClassName: 'rt-SelectItemContent',
      itemIndicatorClassName: 'rt-SelectItemIndicator',
      itemIndicatorContent: thickCheckIcon(h, 'rt-SelectItemIndicatorIcon', true),
      itemTextClassName: 'rt-SelectItemText',
      triggerAttributes: [
        h.DataAttribute('state', model.isOpen ? 'open' : 'closed'),
        ...(config.props?.color === undefined ? [] : [h.DataAttribute('accent-color', config.props.color)]),
        ...(config.props?.radius === undefined ? [] : [h.DataAttribute('radius', config.props.radius)]),
      ],
      contentAttributes: [
        h.DataAttribute('state', model.isOpen ? 'open' : 'closed'),
        h.DataAttribute('accent-color', config.props?.color ?? defaults.accentColor),
        ...(config.props?.radius === undefined ? [] : [h.DataAttribute('radius', config.props.radius)]),
      ],
    }
    const flatItems = config.items.flatMap(item => 'items' in item ? item.items : [item])
    const selectedValue = Option.isSome(config.selectedValue) ? config.selectedValue.value : undefined
    const selected = selectedValue === undefined ? undefined : flatItems.find((item): item is SelectItem<Value> => !('kind' in item) && item.value === selectedValue)
    const triggerContent = h.span([h.Style({ display: 'contents' })], [
      h.span([h.Class('rt-SelectTriggerInner')], [selected !== undefined ? selected.content : config.props?.placeholder ?? config.id]),
      chevronDownIcon(h, 'rt-SelectIcon', true),
    ])
    if (config.position === 'popper') {
      const result = adapter.view(model, { ...config, appearance: { ...appearance, triggerContent } }, h)
      return brandViewResult(addPopperScrollArea(result, config.id, h), 'wseffect/Select')
    }
    const selectedIndex = flatItems.findIndex(item => !('kind' in item) && item.value === selectedValue)
    const firstEnabled = flatItems.findIndex(item => !('kind' in item) && !item.isDisabled)
    let lastEnabled = -1
    flatItems.forEach((item, index) => {
      if (!('kind' in item) && !item.isDisabled) lastEnabled = index
    })
    const triggerOpenMessage = (key: string): Option.Option<Message> => {
      if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Enter' && key !== ' ') return Option.none()
      const index = key === 'ArrowUp'
        ? selectedIndex >= 0 ? selectedIndex : lastEnabled
        : selectedIndex >= 0 ? selectedIndex : firstEnabled
      return Option.some(Message.Opened({ maybeActiveItemIndex: index < 0 ? Option.none() : Option.some(index) }))
    }
    return brandViewResult(h.div([], [
      h.button([
        h.Id(`${config.id}-button`), h.Type('button'), h.Role('combobox'), h.AriaLabel(config.id),
        h.Attribute('aria-haspopup', 'listbox'), h.AriaExpanded(model.isOpen),
        ...(model.isOpen ? [h.Attribute('aria-controls', `${config.id}-items`)] : []),
        ...(Option.isSome(model.maybeActiveItemIndex) ? [h.AriaActiveDescendant(`${config.id}-item-${model.maybeActiveItemIndex.value}`)] : []),
        h.OnClick(model.isOpen ? Message.Closed() : Message.Opened({ maybeActiveItemIndex: Option.none() })),
        h.OnKeyDownPreventDefault(triggerOpenMessage),
        ...appearance.triggerAttributes,
        h.Class(appearance.triggerClassName),
      ], [triggerContent]),
      ...(model.isOpen ? [h.div([
        h.OnMount(SelectPosition.mountSelectPosition({
          panelId: `${config.id}-items`,
          triggerId: `${config.id}-button`,
          selectedItemId: `${config.id}-item-${selectedIndex}`,
          ...(Option.isSome(model.maybeActiveItemIndex)
            ? { activeItemId: `${config.id}-item-${model.maybeActiveItemIndex.value}` }
            : {}),
        })),
      ], [adapter.view(model, { ...config, appearance }, h)])] : []),
    ]), 'wseffect/Select')
  }
  const fold = <ParentModel, ParentMessage, ParentOutMessage>(config: Omit<Update.ChildFoldWithDerivedParentOutMessage<ParentModel, ParentMessage, Model, Message, Message, OutMessage<Value>, ParentOutMessage>, 'update'>): Update.FoldWithOutMessage<ParentModel, ParentMessage, Message, ParentOutMessage> => Update.foldChild({ ...config, update: adapter.update })
  const submodelView = defineView<Model, Message, Config<Value>>((model, inputs, builder) => view(model, inputs, builder))
  const embed = <ParentMessage>(h: HtmlBuilder<ParentMessage>, config: Readonly<{ slotId: string; model: Model; toParentMessage(message: Message): ParentMessage; viewInputs: Config<Value> }>): Html => h.submodel({ slotId: config.slotId, model: config.model, view: submodelView, viewInputs: config.viewInputs, toParentMessage: config.toParentMessage })
  return { Model, Message, OutMessage: Listbox.OutMessage, init: adapter.init, update: adapter.update, view, fold, embed }
}
