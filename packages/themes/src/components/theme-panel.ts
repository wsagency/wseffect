import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { brandViewResult } from 'foldkit/brand'
import { accentColors, grayColors } from '../props/color.props.js'
import { radii } from '../props/radius.props.js'
import * as Theme from './theme.js'
const appearances = ['inherit', 'light', 'dark'] as const
const scalings = ['90%', '95%', '100%', '105%', '110%'] as const
const panelBackgrounds = ['solid', 'translucent'] as const
const PartialSettings = Schema.Struct({
  accentColor: Schema.optional(Schema.Literals(accentColors)), grayColor: Schema.optional(Schema.Literals(grayColors)),
  radius: Schema.optional(Schema.Literals(radii)), scaling: Schema.optional(Schema.Literals(scalings)),
  appearance: Schema.optional(Schema.Literals(appearances)), panelBackground: Schema.optional(Schema.Literals(panelBackgrounds)),
  hasBackground: Schema.optional(Schema.Boolean),
})
export type ThemeSettings = typeof Theme.Settings.Type
export const Props = Schema.Struct({ isOpen: Schema.Boolean, settings: PartialSettings })
export type Message = { _tag: 'SettingsChanged'; settings: Partial<ThemeSettings> }
export type ViewProps = typeof Props.Type & Readonly<{ toSettingsChanged(settings: Partial<ThemeSettings>): Message }>
const optionLabels = Object.freeze({ inherit: 'Inherit', light: 'Light', dark: 'Dark', solid: 'Solid', translucent: 'Translucent', true: 'On', false: 'Off' })
export const view = <M>(props: ViewProps, _children: ReadonlyArray<Html | string>, h: HtmlBuilder<M | Message>): Html => {
  const group = <Key extends keyof ThemeSettings>(label: string, key: Key, values: ReadonlyArray<ThemeSettings[Key]>): Html => {
    const options = values.map(value => {
      const text = String(optionLabels[value as keyof typeof optionLabels] ?? value)
      const selected = props.settings[key] === value
      const attrs = [h.Class('rt-ThemePanelRadioCard'), h.Role('radio'), h.Attribute('aria-checked', String(selected)), h.OnClick(props.toSettingsChanged({ ...props.settings, [key]: value }))]
      return h.button(attrs, [text])
    })
    return h.div([h.Role('group'), h.AriaLabel(label)], [h.h3([], [label]), ...options])
  }
  const panel = h.div([h.Role('region'), h.AriaLabel('Theme settings'), ...(props.isOpen ? [] : [h.Attribute('hidden', '')])], [
    group('Accent color', 'accentColor', accentColors.filter(color => color !== 'custom') as ReadonlyArray<ThemeSettings['accentColor']>),
    group('Gray color', 'grayColor', grayColors), group('Appearance', 'appearance', appearances),
    group('Radius', 'radius', radii), group('Scaling', 'scaling', scalings),
    group('Panel background', 'panelBackground', panelBackgrounds), group('Background', 'hasBackground', [true, false]),
  ])
  return brandViewResult(panel as Html, 'wseffect/ThemePanel')
}
