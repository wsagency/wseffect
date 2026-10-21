import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as Theme from '../src/components/theme.js'
import * as ThemePanel from '../src/components/theme-panel.js'
type Message = ThemePanel.Message
type Model = { settings: Partial<typeof Theme.Settings.Type> }
const update = (model: Model, message: Message) => ({ model: message._tag === 'SettingsChanged' ? { settings: message.settings } : model })
const view = (model: Model, h: HtmlBuilder<Message>) => ThemePanel.view({ isOpen: true, settings: model.settings, toSettingsChanged: settings => ({ _tag: 'SettingsChanged', settings }) }, [], h)
describe('ThemePanel', () => it('emits root setting messages', () => Scene.scene({ update, view }, Scene.given({ settings: { appearance: 'light' } }), Scene.click(Scene.role('radio', { name: 'Dark' })), Scene.expect(Scene.role('radio', { name: 'Dark' })).toHaveAttr('aria-checked', 'true'))))
