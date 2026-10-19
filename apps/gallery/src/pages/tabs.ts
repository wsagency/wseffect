import { Option, Schema } from 'effect'
import { Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import * as Tabs from '@wsagency/wseffect-themes/components/tabs'
import { galleryPageContract, type PageInputs, PageOutMessage } from '../contract.js'

const TabSet = Tabs.create<'Overview' | 'Settings'>()
export const Model = Schema.Struct({ tabs: TabSet.Model, selected: Schema.Literals(['Overview', 'Settings']) })
export const Message = defineMessageUnion({ TabsEvent: { message: TabSet.Message } })
type Model = typeof Model.Type
type Message = typeof Message.Type

const foldTabs = TabSet.fold<Model, Message, typeof PageOutMessage.Type>({
  read: model => Option.some(model.tabs),
  write: (model, tabs) => ({ ...model, tabs }),
  toParentMessage: message => Message.TabsEvent({ message }),
  foldOutMessage: outMessage => model => ({
    model: { ...model, selected: outMessage.value },
  }),
})

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({ model: { tabs: TabSet.init({ id: 'gallery-tabs' }), selected: 'Overview' as const } }),
  update: (model: Model, message: Message) => Message.match(message, {
    TabsEvent: ({ message: tabsMessage }) => foldTabs(model, tabsMessage),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => h.div([], [
    Heading.view({ as: 'h1' }, ['Tabs'], h),
    TabSet.embed(h, {
      slotId: 'gallery-tabs',
      model: model.tabs,
      toParentMessage: message => Message.TabsEvent({ message }),
      viewInputs: {
        tabs: ['Overview', 'Settings'],
        selectedValue: model.selected,
        ariaLabel: 'Gallery sections',
        tabToLabel: value => h.span([], [value]),
        tabToPanel: value => [h.p([], [value === 'Overview' ? 'Overview content' : 'Settings content'])],
      },
    }),
  ])),
})
