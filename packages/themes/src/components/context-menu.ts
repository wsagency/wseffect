import * as UiMenu from '@foldkit/ui/menu'
import { brandViewResult } from 'foldkit/brand'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Update from 'foldkit/update'
import { defineView } from 'foldkit/submodel'
import * as LocalContextMenu from '@wsagency/wseffect-primitives/context-menu'
import type { ContextMenuConfig, ContextMenuGroup, ContextMenuItem, ContextMenuSeparator } from '@wsagency/wseffect-primitives/context-menu'

const themedClasses: NonNullable<ContextMenuConfig<string>['classes']> = Object.freeze({
  panel: 'rt-PopperContent rt-BaseMenuContent rt-ContextMenuContent',
  item: 'rt-reset rt-BaseMenuItem rt-ContextMenuItem',
  group: 'rt-BaseMenuGroup rt-ContextMenuGroup',
  groupLabel: 'rt-BaseMenuLabel rt-ContextMenuLabel',
  separator: 'rt-BaseMenuSeparator rt-ContextMenuSeparator',
})

export const Model = LocalContextMenu.ContextMenuModelSchema
export type Model = LocalContextMenu.ContextMenuModel
export const Message = LocalContextMenu.ContextMenuMessageSchema
export const OutMessage = UiMenu.OutMessage
export type Message = LocalContextMenu.ContextMenuMessage
export type OutMessage<Value extends string> = LocalContextMenu.ContextMenuOutMessage<Value>
export type Config<Value extends string> = Omit<ContextMenuConfig<Value>, 'classes'>
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
    brandViewResult(contextMenu.view(model, { ...config, classes: themedClasses }, h), 'wseffect/ContextMenu')
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
