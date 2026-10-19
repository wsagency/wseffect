import { brandViewResult } from 'foldkit/brand'
import { childAttributes, type Html, type HtmlBuilder } from 'foldkit/html'
import * as Update from 'foldkit/update'
import { defineView } from 'foldkit/submodel'
import * as UiTabs from '@foldkit/ui/tabs'
import type { ViewInputs as TabsViewInputs } from '@foldkit/ui/tabs'

export type EmbedConfig<Value extends string, ParentMessage> = Readonly<{
  slotId: string
  model: UiTabs.Model
  toParentMessage: (message: UiTabs.Message) => ParentMessage
  viewInputs: TabsViewInputs<Value>
}>

export type Bundle<Value extends string> = Readonly<{
  Model: typeof UiTabs.Model
  Message: typeof UiTabs.Message
  OutMessage: typeof UiTabs.OutMessage
  init: typeof UiTabs.init
  update: UiTabs.Bundle<Value>['update']
  view: UiTabs.Bundle<Value>['view']
  fold: <ParentModel, ParentMessage, ParentOutMessage>(
    config: Omit<Update.ChildFoldWithDerivedParentOutMessage<ParentModel, ParentMessage, UiTabs.Model, UiTabs.Message, UiTabs.Message, UiTabs.OutMessage<Value>, ParentOutMessage>, 'update'>,
  ) => Update.FoldWithOutMessage<ParentModel, ParentMessage, UiTabs.Message, ParentOutMessage>
  embed: <ParentMessage>(h: HtmlBuilder<ParentMessage>, config: EmbedConfig<Value, ParentMessage>) => Html
}>

export const create = <Value extends string>(): Bundle<Value> => {
  const tabs = UiTabs.create<Value>()
  const view = defineView<UiTabs.Model, UiTabs.Message, TabsViewInputs<Value>>((model, inputs, h) =>
    brandViewResult(tabs.view(model, {
      ...inputs,
      toView: render => inputs.toView({
        ...render,
        tablist: [...render.tablist, ...childAttributes([h.Class('rt-TabsList')])],
        tabs: render.tabs.map(tab => ({
          ...tab,
          tab: [...tab.tab, ...childAttributes([h.Class('rt-TabsTrigger')])],
          panel: [...tab.panel, ...childAttributes([h.Class('rt-TabsContent')])],
        })),
      }),
    }, h), 'wseffect/Tabs'),
  )

  const fold = <ParentModel, ParentMessage, ParentOutMessage>(
    config: Omit<Update.ChildFoldWithDerivedParentOutMessage<ParentModel, ParentMessage, UiTabs.Model, UiTabs.Message, UiTabs.Message, UiTabs.OutMessage<Value>, ParentOutMessage>, 'update'>,
  ): Update.FoldWithOutMessage<ParentModel, ParentMessage, UiTabs.Message, ParentOutMessage> => Update.foldChild({ ...config, update: tabs.update })

  const embed = <ParentMessage>(h: HtmlBuilder<ParentMessage>, config: EmbedConfig<Value, ParentMessage>): Html => h.submodel({
    slotId: config.slotId,
    model: config.model,
    view,
    viewInputs: config.viewInputs,
    toParentMessage: config.toParentMessage,
  })

  return {
    Model: UiTabs.Model,
    Message: UiTabs.Message,
    OutMessage: UiTabs.OutMessage,
    init: UiTabs.init,
    update: tabs.update,
    view,
    fold,
    embed,
  }
}
