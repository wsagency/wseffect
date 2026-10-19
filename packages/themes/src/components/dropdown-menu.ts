import { brandViewResult } from 'foldkit/brand'
import * as Update from 'foldkit/update'
import { defineView } from 'foldkit/submodel'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as UiMenu from '@foldkit/ui/menu'
import type { ViewInputs as MenuViewInputs } from '@foldkit/ui/menu'
import type { Settings as ThemeSettings } from './theme.js'
import { portalThemeAttributes, themeClassName } from './themeAttributes.js'

type ViewInputs<Item extends string> = MenuViewInputs<Item> & Readonly<{ themeSettings?: Partial<ThemeSettings> }>

const triggerClassName = 'rt-reset rt-BaseButton rt-r-size-2 rt-variant-solid rt-Button'
const itemClassName = 'rt-reset rt-BaseMenuItem rt-DropdownMenuItem'
const panelClassName = 'rt-PopperContent rt-BaseMenuContent rt-DropdownMenuContent rt-r-size-2 rt-variant-solid'
const viewportClassName = 'rt-BaseMenuViewport rt-DropdownMenuViewport'

export type EmbedConfig<Item extends string, ParentMessage> = Readonly<{
  slotId: string
  model: UiMenu.Model
  toParentMessage: (message: UiMenu.Message) => ParentMessage
  viewInputs: ViewInputs<Item>
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
  const view = defineView<UiMenu.Model, UiMenu.Message, ViewInputs<Item>>((model, inputs, h) => {
    const { themeSettings, ...menuInputs } = inputs
    return brandViewResult(menu.view(model, {
      ...menuInputs,
      buttonClassName: [triggerClassName, menuInputs.buttonClassName].filter(Boolean).join(' '),
      itemsClassName: [themeClassName(themeSettings?.appearance), panelClassName, menuInputs.itemsClassName].filter(Boolean).join(' '),
      itemsAttributes: [...portalThemeAttributes(themeSettings ?? {}, h), ...(menuInputs.itemsAttributes ?? [])],
      itemsScrollClassName: [viewportClassName, menuInputs.itemsScrollClassName].filter(Boolean).join(' '),
      itemToConfig: (item, context) => {
        const config = menuInputs.itemToConfig(item, context)
        return { ...config, className: config.className ? `${itemClassName} ${config.className}` : itemClassName }
      },
    }, h), 'wseffect/DropdownMenu')
  })

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
