import { Schema } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { defineMessageUnion } from 'foldkit/message'
import { describe, it } from 'vitest'
import * as Switch from '../src/components/switch.js'
const Message = defineMessageUnion({ Toggled: { checked: Schema.Boolean }, Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<{ checked: boolean }>, message: Message) => ({ model: message._tag === 'Toggled' ? { checked: message.checked } : model })
const view = (model: Readonly<{ checked: boolean }>, h: HtmlBuilder<Message>) => Switch.view({ id: 'notifications', checked: model.checked, size: { initial: '1', md: '3' }, highContrast: true, onCheckedChange: checked => Message.Toggled({ checked }) }, ['Notifications'], h)
describe('Switch', () => {
  it('renders controlled state and toggles through Space', () => Scene.scene({ update, view }, Scene.given({ checked: false }), Scene.expect(Scene.role('switch', { name: 'Notifications' })).toHaveAttr('aria-checked', 'false'), Scene.expect(Scene.role('switch', { name: 'Notifications' })).toHaveAttr('class', 'rt-reset rt-SwitchRoot rt-r-size-1 md:rt-r-size-3 rt-variant-surface rt-high-contrast'), Scene.keydown(Scene.role('switch', { name: 'Notifications' }), ' '), Scene.expect(Scene.role('switch', { name: 'Notifications' })).toHaveAttr('aria-checked', 'true')))
})
