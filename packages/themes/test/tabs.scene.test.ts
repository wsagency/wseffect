import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as Tabs from '../src/components/tabs.js'

const TabsBundle = Tabs.create<'overview' | 'settings'>()
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
type Model = Readonly<{ tabs: typeof TabsBundle.Model.Type; selected: 'overview' | 'settings' }>
const update = (model: Model, _message: Message) => ({ model })
const view = (model: Model, h: HtmlBuilder<Message>) => TabsBundle.embed(h, {
  slotId: 'settings-tabs',
  model: model.tabs,
  toParentMessage: () => Message.Tick(),
  viewInputs: {
    tabs: ['overview', 'settings'],
    selectedValue: model.selected,
    ariaLabel: 'Settings sections',
    toView: render => h.div([], [
      h.div([...render.tablist], render.tabs.map(tab => h.button([...tab.tab], [tab.value]))),
      ...render.tabs.filter(tab => tab.isActive).map(tab => h.div([...tab.panel], [`Panel ${tab.value}`])),
    ]),
  },
})

describe('themed Tabs view', () => {
  it('preserves ARIA and keyboard tab state with Radix classes', () => {
    Scene.scene(
      { update, view },
      Scene.given({ tabs: TabsBundle.init({ id: 'settings' }), selected: 'overview' }),
      Scene.expect(Scene.role('tablist')).toHaveAttr('class', 'rt-TabsList'),
      Scene.expect(Scene.role('tab', { name: 'overview' })).toHaveAttr('class', 'rt-TabsTrigger'),
      Scene.expect(Scene.role('tab', { name: 'overview' })).toHaveAttr('aria-selected', 'true'),
      Scene.expect(Scene.role('tabpanel')).toExist(),
      Scene.expect(Scene.role('tab', { name: 'overview' })).toHaveAttr('tabIndex', '0'),
    )
  })
})
