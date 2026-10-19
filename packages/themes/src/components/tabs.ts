import { brandViewResult } from 'foldkit/brand'
import { childAttributes, type Html, type HtmlBuilder } from 'foldkit/html'
import * as Update from 'foldkit/update'
import { defineView } from 'foldkit/submodel'
import * as UiTabs from '@foldkit/ui/tabs'
import type { ViewInputs as TabsViewInputs } from '@foldkit/ui/tabs'

export type ThemedViewInputs<Value extends string> = Omit<TabsViewInputs<Value>, 'toView'> & Readonly<{
  tabToLabel: (value: Value) => Html
  tabToPanel: (value: Value) => ReadonlyArray<Html | string>
}>

export type EmbedConfig<Value extends string, ParentMessage> = Readonly<{
  slotId: string
  model: UiTabs.Model
  toParentMessage: (message: UiTabs.Message) => ParentMessage
  viewInputs: ThemedViewInputs<Value>
}>

export type Bundle<Value extends string> = Readonly<{
  Model: typeof UiTabs.Model
  Message: typeof UiTabs.Message
  OutMessage: typeof UiTabs.OutMessage
  init: typeof UiTabs.init
  update: UiTabs.Bundle<Value>['update']
  view: (model: UiTabs.Model, inputs: ThemedViewInputs<Value>, h: HtmlBuilder<UiTabs.Message>) => Html
  fold: <ParentModel, ParentMessage, ParentOutMessage>(
    config: Omit<Update.ChildFoldWithDerivedParentOutMessage<ParentModel, ParentMessage, UiTabs.Model, UiTabs.Message, UiTabs.Message, UiTabs.OutMessage<Value>, ParentOutMessage>, 'update'>,
  ) => Update.FoldWithOutMessage<ParentModel, ParentMessage, UiTabs.Message, ParentOutMessage>
  embed: <ParentMessage>(h: HtmlBuilder<ParentMessage>, config: EmbedConfig<Value, ParentMessage>) => Html
}>

export const create = <Value extends string>(): Bundle<Value> => {
  const tabs = UiTabs.create<Value>()
  const view = defineView<UiTabs.Model, UiTabs.Message, ThemedViewInputs<Value>>((model, inputs, h) =>
    brandViewResult(tabs.view(model, {
      tabs: inputs.tabs,
      selectedValue: inputs.selectedValue,
      ariaLabel: inputs.ariaLabel,
      isTabDisabled: inputs.isTabDisabled,
      orientation: inputs.orientation,
      panelMount: inputs.panelMount,
      toView: render => h.div([h.Class('rt-TabsRoot')], [
        h.div([...render.tablist, ...childAttributes([h.Class('rt-BaseTabList rt-TabsList rt-r-size-2')])], render.tabs.map(tab => {
          return h.button([
            ...tab.tab,
            ...childAttributes([
              h.Class('rt-reset rt-BaseTabListTrigger rt-TabsTrigger'),
              h.DataAttribute('state', tab.isActive ? 'active' : 'inactive'),
            ]),
          ], [
            h.span([...childAttributes([h.Class('rt-BaseTabListTriggerInner rt-TabsTriggerInner')])], [inputs.tabToLabel(tab.value)]),
            h.span([...childAttributes([h.Class('rt-BaseTabListTriggerInnerHidden rt-TabsTriggerInnerHidden')])], [inputs.tabToLabel(tab.value)]),
          ])
        })),
        ...render.tabs
          .filter(tab => tab.isActive || inputs.panelMount === 'All')
          .map(tab => h.div([
            ...tab.panel,
            ...childAttributes([
              h.Class('rt-TabsContent'),
              h.DataAttribute('state', tab.isActive ? 'active' : 'inactive'),
              ...(!tab.isActive ? [h.Hidden(true)] : []),
            ]),
          ], inputs.tabToPanel(tab.value))),
      ]),
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
