import { childAttributes, type ChildAttribute, type HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
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

const portalThemeAttributesCache = new Map<string, ReadonlyArray<ChildAttribute>>()

export const portalThemeAttributes = <Message>(settings: Partial<Settings>, h: HtmlBuilder<Message>): ReadonlyArray<ChildAttribute> => {
  const accentColor = settings.accentColor ?? defaults.accentColor
  const grayColor = settings.grayColor ?? defaults.grayColor
  const radius = settings.radius ?? defaults.radius
  const scaling = settings.scaling ?? defaults.scaling
  const panelBackground = settings.panelBackground ?? defaults.panelBackground
  const cacheKey = `${accentColor}\u0000${grayColor}\u0000${radius}\u0000${scaling}\u0000${panelBackground}`
  const cachedAttributes = portalThemeAttributesCache.get(cacheKey)
  if (cachedAttributes !== undefined) return cachedAttributes
  const attributes = childAttributes([
    h.DataAttribute('is-root-theme', 'false'),
    h.DataAttribute('accent-color', accentColor),
    h.DataAttribute('gray-color', grayColor === 'auto' ? grayMatch[accentColor] : grayColor),
    h.DataAttribute('radius', radius),
    h.DataAttribute('scaling', scaling),
    h.DataAttribute('has-background', 'false'),
    h.DataAttribute('panel-background', panelBackground),
  ])
  portalThemeAttributesCache.set(cacheKey, attributes)
  return attributes
}
