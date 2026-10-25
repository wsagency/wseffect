import { brandViewResult } from '@wsagency/wseffect-foldkit/brand'
import * as Update from '@wsagency/wseffect-foldkit/update'
import { defineView } from '@wsagency/wseffect-foldkit/submodel'
import type { Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as UiMenu from '@wsagency/wseffect-foldkit-ui/menu'
import type { ViewInputs as MenuViewInputs } from '@wsagency/wseffect-foldkit-ui/menu'
import type { Settings as ThemeSettings } from './theme.js'
import { portalThemeAttributes, themeClassName } from './themeAttributes.js'

type ViewInputs<Item extends string> = MenuViewInputs<Item> & Readonly<{
  /** Explicitly override the shared portal-root Theme for a nested menu; omit to inherit the root Theme. */
  themeSettings?: Partial<ThemeSettings>
}>

const triggerClassName = 'rt-reset rt-BaseButton rt-r-size-2 rt-variant-solid rt-Button'
const itemClassName = 'rt-reset rt-BaseMenuItem rt-DropdownMenuItem'
const panelClassName = 'rt-PopperContent rt-BaseMenuContent rt-DropdownMenuContent rt-r-size-2 rt-variant-solid'
const viewportClassName = 'rt-BaseMenuViewport rt-DropdownMenuViewport'

const panelClassNamesByAppearance: Readonly<Record<ThemeSettings['appearance'], string>> = Object.freeze({
  inherit: `${themeClassName('inherit')} ${panelClassName}`,
  light: `${themeClassName('light')} ${panelClassName}`,
  dark: `${themeClassName('dark')} ${panelClassName}`,
})

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
    const themeSettings = inputs.themeSettings
    const menuInputs: MenuViewInputs<Item> = inputs
    const isLeaving = model.animation.transitionState === 'LeaveStart' || model.animation.transitionState === 'LeaveAnimating'
    const isVisible = model.isOpen || isLeaving
    const portalAttributes = themeSettings !== undefined && isVisible
      ? portalThemeAttributes(themeSettings, h)
      : undefined
    const existingItemsAttributes = menuInputs.itemsAttributes ?? []
    const itemsAttributes = portalAttributes === undefined
      ? existingItemsAttributes
      : existingItemsAttributes.length === 0
        ? portalAttributes
        : [...portalAttributes, ...existingItemsAttributes]
    const basePanelClassName = panelClassNamesByAppearance[themeSettings?.appearance ?? 'inherit']
    return brandViewResult(menu.view(model, {
      ...menuInputs,
      buttonClassName: menuInputs.buttonClassName ? `${triggerClassName} ${menuInputs.buttonClassName}` : triggerClassName,
      itemsClassName: menuInputs.itemsClassName ? `${basePanelClassName} ${menuInputs.itemsClassName}` : basePanelClassName,
      itemsAttributes,
      itemsScrollClassName: menuInputs.itemsScrollClassName ? `${viewportClassName} ${menuInputs.itemsScrollClassName}` : viewportClassName,
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
