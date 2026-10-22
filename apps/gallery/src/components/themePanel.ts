import '@wsagency/wseffect-themes/css/theme-panel.css'
import { Schema } from 'effect'
import { Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as ThemePanel from '@wsagency/wseffect-themes/components/theme-panel'
import * as Button from '@wsagency/wseffect-themes/components/button'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, PageOutMessage, type PageInputs } from '../contract.js'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'
export const Model = Schema.Struct({ isOpen: Schema.Boolean, settings: Schema.Unknown })
export const Message = defineMessageUnion({ Toggle: {}, SettingsChanged: { settings: Schema.Unknown } })
type Model = typeof Model.Type; type Message = typeof Message.Type
const themeSettingKeys = ['accentColor', 'grayColor', 'radius', 'scaling', 'appearance', 'panelBackground', 'hasBackground'] as const
export const page = galleryPageContract.definePage({ Model, Message, init: () => ({ model: { isOpen: false, settings: { accentColor: 'indigo', grayColor: 'slate', radius: 'medium', scaling: '100%', appearance: 'light', panelBackground: 'translucent', hasBackground: true } } }), update: (model: Model, message: Message) => Message.match(message, { Toggle: () => ({ model: { ...model, isOpen: !model.isOpen } }), SettingsChanged: ({ settings }) => {
  const previous = model.settings as ThemePanel.ThemeSettings
  const next = settings as ThemePanel.ThemeSettings
  const setting = themeSettingKeys.find(key => previous[key] !== next[key])
  return setting === undefined
    ? { model: { ...model, settings } }
    : { model: { ...model, settings }, outMessage: PageOutMessage.ChangedThemeSetting({ setting, value: String(next[setting]) }) }
} }), view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => h.div([], [
  Heading.view({ as: 'h1' }, ['Theme panel'], h),
  Button.view({ onClick: Message.Toggle() }, ['Open theme settings'], h),
  ThemePanel.view({
    isOpen: model.isOpen,
    settings: model.settings as ThemePanel.ThemeSettings,
    toSettingsChanged: settings => ({ _tag: 'SettingsChanged', settings }),
  }, [], h),
])) })
export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  const settings = { accentColor: 'indigo', grayColor: 'gray', radius: 'medium', scaling: '100%', appearance: request.theme, panelBackground: 'translucent', hasBackground: true } as const
  renderCaptureView(root, request, h => ThemePanel.view({ isOpen: true, settings, toSettingsChanged: settings => ({ _tag: 'SettingsChanged', settings }) as never }, [], h))
}
