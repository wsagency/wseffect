import { brandViewResult } from 'foldkit/brand'
import * as Update from 'foldkit/update'
import { defineView } from 'foldkit/submodel'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as UiMenu from '@foldkit/ui/menu'
import type { ViewInputs as MenuViewInputs } from '@foldkit/ui/menu'

const triggerClassName = 'rt-reset rt-BaseButton rt-r-size-2 rt-variant-solid rt-DropdownMenuTrigger'
const panelClassName = 'rt-PopperContent rt-BaseMenuContent rt-DropdownMenuContent'

export type EmbedConfig<Item extends string, ParentMessage> = Readonly<{
  slotId: string
  model: UiMenu.Model
  toParentMessage: (message: UiMenu.Message) => ParentMessage
  viewInputs: MenuViewInputs<Item>
}>

export type Bundle<Item extends string> = Readonly<{
  Model: typeof UiMenu.Model
  Message: typeof UiMenu.Message
  OutMessage: typeof UiMenu.OutMessage
  init: typeof UiMenu.init
  update: UiMenu.Bundle<Item>['update']
  view: UiMenu.Bundle<Item>['view']
  fold: <ParentModel, ParentMessage, ParentOutMessage>(
    config: Omit<Update.ChildFoldWithDerivedParentOutMessage<ParentModel, ParentMessage, UiMenu.Model, UiMenu.Message, UiMenu.Message, UiMenu.OutMessage<Item>, ParentOutMessage>, 'update'>,
  ) => Update.FoldWithOutMessage<ParentModel, ParentMessage, UiMenu.Message, ParentOutMessage>
  embed: <ParentMessage>(h: HtmlBuilder<ParentMessage>, config: EmbedConfig<Item, ParentMessage>) => Html
}>

export const create = <Item extends string>(): Bundle<Item> => {
  const menu = UiMenu.create<Item>()
  const view = defineView<UiMenu.Model, UiMenu.Message, MenuViewInputs<Item>>((model, inputs, h) =>
    brandViewResult(menu.view(model, {
      ...inputs,
      buttonClassName: [triggerClassName, inputs.buttonClassName].filter(Boolean).join(' '),
      itemsClassName: [panelClassName, inputs.itemsClassName].filter(Boolean).join(' '),
    }, h), 'wseffect/DropdownMenu'),
  )

  const fold = <ParentModel, ParentMessage, ParentOutMessage>(
    config: Omit<Update.ChildFoldWithDerivedParentOutMessage<ParentModel, ParentMessage, UiMenu.Model, UiMenu.Message, UiMenu.Message, UiMenu.OutMessage<Item>, ParentOutMessage>, 'update'>,
  ): Update.FoldWithOutMessage<ParentModel, ParentMessage, UiMenu.Message, ParentOutMessage> => Update.foldChild({ ...config, update: menu.update })

  const embed = <ParentMessage>(h: HtmlBuilder<ParentMessage>, config: EmbedConfig<Item, ParentMessage>): Html => h.submodel({
    slotId: config.slotId,
    model: config.model,
    view,
    viewInputs: config.viewInputs,
    toParentMessage: config.toParentMessage,
  })

  return {
    Model: UiMenu.Model,
    Message: UiMenu.Message,
    OutMessage: UiMenu.OutMessage,
    init: UiMenu.init,
    update: menu.update,
    view,
    fold,
    embed,
  }
}
