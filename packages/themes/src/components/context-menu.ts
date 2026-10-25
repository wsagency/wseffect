import * as UiMenu from '@wsagency/wseffect-foldkit-ui/menu'
import { brandViewResult } from '@wsagency/wseffect-foldkit/brand'
import type { Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Update from '@wsagency/wseffect-foldkit/update'
import { defineView } from '@wsagency/wseffect-foldkit/submodel'
import * as LocalContextMenu from '@wsagency/wseffect-primitives/context-menu'
import type { ContextMenuConfig, ContextMenuGroup, ContextMenuItem, ContextMenuSeparator } from '@wsagency/wseffect-primitives/context-menu'

import { Schema } from 'effect'
import { accentColors } from '../props/color.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveClasses, responsiveProp } from '../props/responsive.js'
import { defaults } from './theme.js'

const contentSizes = ['1', '2'] as const
const contentVariants = ['solid', 'soft'] as const
export const Props = Schema.Struct({
  variant: Schema.optional(Schema.Literals(contentVariants)),
  size: Schema.optional(responsiveSchema(contentSizes)),
  color: Schema.optional(Schema.Literals(accentColors)),
  highContrast: Schema.optional(Schema.Boolean),
})
export type Props = typeof Props.Type
const sizeProp = responsiveProp({ className: 'rt-r-size', values: contentSizes })

const themedClasses = (config: Config<string>): NonNullable<ContextMenuConfig<string>['classes']> => {
  const size = responsiveClasses(sizeProp, config.size ?? '2')
  return Object.freeze({
    panel: ['rt-PopperContent', 'rt-BaseMenuContent', 'rt-ContextMenuContent', ...size.classes,
      `rt-variant-${config.variant ?? 'solid'}`, ...(config.highContrast ? ['rt-high-contrast'] : [])].join(' '),
    item: 'rt-reset rt-BaseMenuItem rt-ContextMenuItem',
    group: 'rt-BaseMenuGroup rt-ContextMenuGroup',
    groupLabel: 'rt-BaseMenuLabel rt-ContextMenuLabel',
    separator: 'rt-BaseMenuSeparator rt-ContextMenuSeparator',
  })
}


export const Model = LocalContextMenu.ContextMenuModelSchema
export type Model = LocalContextMenu.ContextMenuModel
export const Message = LocalContextMenu.ContextMenuMessageSchema
export const OutMessage = UiMenu.OutMessage
export type Message = LocalContextMenu.ContextMenuMessage
export type OutMessage<Value extends string> = LocalContextMenu.ContextMenuOutMessage<Value>
export type Config<Value extends string> = Omit<ContextMenuConfig<Value>, 'classes' | 'color'> & Props
export type Item<Value extends string> = ContextMenuItem<Value>
export type Group<Value extends string> = ContextMenuGroup<Value>
export type Separator = ContextMenuSeparator

export type Bundle<Value extends string> = Readonly<{
  Model: typeof Model
  Message: typeof Message
  OutMessage: typeof UiMenu.OutMessage
  init: (config: Config<Value>) => Model
  update: (model: Model, message: Message) => Update.ReturnWithOutMessage<Model, Message, OutMessage<Value>>
  view: (model: Model, config: Config<Value>, h: HtmlBuilder<Message>) => Html
  fold: <ParentModel, ParentMessage, ParentOutMessage>(
    config: Omit<Update.ChildFoldWithDerivedParentOutMessage<ParentModel, ParentMessage, Model, Config<Value>, Message, OutMessage<Value>, ParentOutMessage>, 'update'>,
  ) => Update.FoldWithOutMessage<ParentModel, ParentMessage, Message, ParentOutMessage>
  embed: <ParentMessage>(h: HtmlBuilder<ParentMessage>, config: EmbedConfig<Value, ParentMessage>) => Html
}>

export type EmbedConfig<Value extends string, ParentMessage> = Readonly<{
  slotId: string
  model: Model
  config: Config<Value>
  toParentMessage: (message: Message) => ParentMessage
}>

export const create = <Value extends string>(): Bundle<Value> => {
  const contextMenu = LocalContextMenu.createContextMenu<Value>()
  const view = defineView<Model, Message, Config<Value>>((model, config, h) =>
    brandViewResult(contextMenu.view(model, { ...config, color: config.color ?? defaults.accentColor, classes: themedClasses(config) }, h), 'wseffect/ContextMenu')
  )
  const fold = <ParentModel, ParentMessage, ParentOutMessage>(
    config: Omit<Update.ChildFoldWithDerivedParentOutMessage<ParentModel, ParentMessage, Model, Config<Value>, Message, OutMessage<Value>, ParentOutMessage>, 'update'>,
  ): Update.FoldWithOutMessage<ParentModel, ParentMessage, Message, ParentOutMessage> => Update.foldChild({ ...config, update: contextMenu.update })
  const embed = <ParentMessage>(h: HtmlBuilder<ParentMessage>, config: EmbedConfig<Value, ParentMessage>): Html => h.submodel({
    slotId: config.slotId,
    model: config.model,
    view,
    viewInputs: config.config,
    toParentMessage: config.toParentMessage,
  })
  return { Model, Message, OutMessage: UiMenu.OutMessage, init: contextMenu.init, update: contextMenu.update, view, fold, embed }
}
