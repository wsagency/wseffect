import { Schema } from 'effect'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import { describe, it } from 'vitest'
import * as Switch from '../src/components/switch.js'
const Message = defineMessageUnion({ Toggled: { checked: Schema.Boolean }, Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<{ checked: boolean }>, message: Message) => message._tag === 'Toggled' ? { model: { checked: message.checked } } : { model }
const view = (model: Readonly<{ checked: boolean }>, h: HtmlBuilder<Message>) => Switch.view({ id: 'notifications', checked: model.checked, size: { initial: '1', md: '3' }, highContrast: true, radius: 'full', onCheckedChange: checked => Message.Toggled({ checked }) }, ['Notifications'], h)
describe('Switch', () => {
  it('renders controlled state, radius and toggles through Space', () => Scene.scene({ update, view }, Scene.given({ checked: false }), Scene.expect(Scene.role('switch', { name: 'Notifications' })).toHaveAttr('aria-checked', 'false'), Scene.expect(Scene.role('switch', { name: 'Notifications' })).toHaveAttr('data-radius', 'full'), Scene.expect(Scene.role('switch', { name: 'Notifications' })).toHaveAttr('class', 'rt-reset rt-SwitchRoot rt-r-size-1 md:rt-r-size-3 rt-variant-surface rt-high-contrast'), Scene.keydown(Scene.role('switch', { name: 'Notifications' }), ' '), Scene.expect(Scene.role('switch', { name: 'Notifications' })).toHaveAttr('aria-checked', 'true')))
})
