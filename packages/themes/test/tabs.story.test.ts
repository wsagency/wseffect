import * as Option from 'effect/Option'
import { Schema } from 'effect'
import * as Story from '@wsagency/wseffect-foldkit/story'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import { describe, it } from 'vitest'
import * as UiTabs from '@wsagency/wseffect-foldkit-ui/tabs'
import * as Tabs from '../src/components/tabs.js'

const TabsBundle = Tabs.create<'overview' | 'settings'>()
const ParentMessage = defineMessageUnion({ GotTabs: { message: TabsBundle.Message } })
const ParentOutMessage = defineMessageUnion({ Selected: { value: Schema.String, index: Schema.Number } })
type ParentModel = Readonly<{ tabs: typeof TabsBundle.Model.Type }>
type ParentMessage = typeof ParentMessage.Type
type ParentOutMessage = typeof ParentOutMessage.Type
const foldTabs = TabsBundle.fold<ParentModel, ParentMessage, ParentOutMessage>({
  read: model => Option.some(model.tabs),
  write: (model, tabs) => ({ ...model, tabs }),
  toParentMessage: message => ParentMessage.GotTabs({ message }),
  foldOutMessage: outMessage => model => ({ model, outMessage: ParentOutMessage.Selected({ value: outMessage.value, index: outMessage.index }) }),
})
const update = (model: ParentModel, message: ParentMessage) => ParentMessage.match(message, {
  GotTabs: ({ message: childMessage }) => foldTabs(model, childMessage),
})

describe('Tabs wrapper', () => {
  it('forwards a selected tab to the parent OutMessage', () => {
    Story.story(
      update,
      Story.given({ tabs: TabsBundle.init({ id: 'settings' }) }),
      Story.message(ParentMessage.GotTabs({ message: TabsBundle.Message.SelectedTab({ index: 1, value: 'settings' }) })),
      Story.expectOutMessage(ParentOutMessage.Selected({ value: 'settings', index: 1 })),
      Story.Command.resolve(UiTabs.FocusTab, UiTabs.Message.CompletedFocusTab()),
    )
  })
})
