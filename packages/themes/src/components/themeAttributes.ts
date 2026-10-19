import { childAttributes, type ChildAttribute, type HtmlBuilder } from 'foldkit/html'
import { grayMatch } from '../props/grayMatch.js'
import type { Settings } from './theme.js'

const themeClassNames: Readonly<Record<Settings['appearance'], string>> = Object.freeze({
  inherit: 'radix-themes',
  light: 'radix-themes light',
  dark: 'radix-themes dark',
})

export const defaults: Settings = {
  accentColor: 'indigo',
  grayColor: 'auto',
  radius: 'medium',
  scaling: '100%',
  appearance: 'inherit',
  panelBackground: 'translucent',
  hasBackground: true,
}

export const themeClassName = (appearance: Settings['appearance'] | undefined): string => themeClassNames[appearance ?? defaults.appearance]

export const portalThemeAttributes = <Message>(settings: Partial<Settings>, h: HtmlBuilder<Message>): ReadonlyArray<ChildAttribute> => {
  const accentColor = settings.accentColor ?? defaults.accentColor
  const grayColor = settings.grayColor ?? defaults.grayColor
  return childAttributes([
    h.DataAttribute('is-root-theme', 'false'),
    h.DataAttribute('accent-color', accentColor),
    h.DataAttribute('gray-color', grayColor === 'auto' ? grayMatch[accentColor] : grayColor),
    h.DataAttribute('radius', settings.radius ?? defaults.radius),
    h.DataAttribute('scaling', settings.scaling ?? defaults.scaling),
    h.DataAttribute('has-background', 'false'),
    h.DataAttribute('panel-background', settings.panelBackground ?? defaults.panelBackground),
  ])
}
