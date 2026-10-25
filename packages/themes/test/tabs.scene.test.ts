import { Schema } from 'effect'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, it } from 'vitest'
import * as Tabs from '../src/components/tabs.js'

const TabsBundle = Tabs.create<'overview' | 'settings'>()
const Message = defineMessageUnion({ Selected: { value: Schema.Literals(['overview', 'settings']) }, Tick: {} })
type Message = typeof Message.Type
type Model = Readonly<{ tabs: typeof TabsBundle.Model.Type; selected: 'overview' | 'settings' }>
const update = (model: Model, message: Message) => Message.match(message, {
  Selected: ({ value }) => ({ model: { ...model, selected: value } }),
  Tick: () => ({ model }),
})
const view = (model: Model, h: HtmlBuilder<Message>) => TabsBundle.embed(h, {
  slotId: 'settings-tabs',
  model: model.tabs,
  toParentMessage: message => message._tag === 'SelectedTab' ? Message.Selected({ value: message.value as Model['selected'] }) : Message.Tick(),
  viewInputs: {
    tabs: ['overview', 'settings'],
    selectedValue: model.selected,
    ariaLabel: 'Settings sections',
    tabToLabel: value => h.span([], [value === 'overview' ? 'Overview tab label' : 'Settings tab label']),
    tabToPanel: value => [h.p([], [value === 'overview' ? 'Overview panel content' : 'Settings panel content'])],
  },
})

describe('themed Tabs view', () => {
  it('preserves ARIA and keyboard tab state with Radix classes', () => {
    Scene.scene(
      { update, view },
      Scene.given({ tabs: TabsBundle.init({ id: 'settings' }), selected: 'overview' }),
      Scene.expect(Scene.role('tablist')).toHaveAttr('class', 'rt-BaseTabList rt-TabsList rt-r-size-2'),
      Scene.expect(Scene.selector('#settings-tab-0')).toHaveAttr('class', 'rt-reset rt-BaseTabListTrigger rt-TabsTrigger'),
      Scene.expect(Scene.selector('#settings-tab-0')).toHaveAttr('role', 'tab'),
      Scene.expect(Scene.selector('#settings-tab-0')).toHaveAttr('aria-selected', 'true'),
      Scene.expect(Scene.selector('#settings-tab-0')).toHaveAttr('data-state', 'active'),
      Scene.expect(Scene.selector('.rt-BaseTabListTriggerInner.rt-TabsTriggerInner')).toExist(),
      Scene.expect(Scene.selector('.rt-BaseTabListTriggerInnerHidden.rt-TabsTriggerInnerHidden')).toExist(),
      Scene.expect(Scene.text('Overview tab label')).toExist(),
      Scene.expect(Scene.text('Overview panel content')).toExist(),
      Scene.expect(Scene.role('tabpanel')).toExist(),
      Scene.expect(Scene.selector('#settings-tab-0')).toHaveAttr('tabIndex', '0'),
      Scene.click(Scene.selector('#settings-tab-1')),
      Scene.expect(Scene.selector('#settings-tab-1')).toHaveAttr('data-state', 'active'),
      Scene.expect(Scene.selector('#settings-tab-0')).toHaveAttr('data-state', 'inactive'),
      Scene.expect(Scene.text('Settings tab label')).toExist(),
      Scene.expect(Scene.text('Settings panel content')).toExist(),
    )
  })
})
