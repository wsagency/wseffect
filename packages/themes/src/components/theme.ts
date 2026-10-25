import { brandViewResult } from '@wsagency/wseffect-foldkit/brand'
import { Schema } from 'effect'
import type { Attribute, Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { accentColors, grayColors } from '../props/color.props.js'
import { grayMatch } from '../props/grayMatch.js'
import { radii } from '../props/radius.props.js'
import { defaults, themeClassName } from './themeAttributes.js'
export { defaults } from './themeAttributes.js'

const appearances = ['inherit', 'light', 'dark'] as const
const scalings = ['90%', '95%', '100%', '105%', '110%'] as const
const panelBackgrounds = ['solid', 'translucent'] as const

export const Settings = Schema.Struct({
  accentColor: Schema.Literals(accentColors),
  grayColor: Schema.Literals(grayColors),
  radius: Schema.Literals(radii),
  scaling: Schema.Literals(scalings),
  appearance: Schema.Literals(appearances),
  panelBackground: Schema.Literals(panelBackgrounds),
  hasBackground: Schema.Boolean,
})

export type Settings = typeof Settings.Type


export type ViewProps = Readonly<{
  settings: Partial<Settings>
  isRoot: boolean
  id?: string
}>


export const view = <Message>(
  { settings, isRoot, id }: ViewProps,
  children: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Message>,
): Html => {
  const attributes: Attribute<Message>[] = [h.Class(themeClassName(settings.appearance))]
  if (id !== undefined) attributes.push(h.Id(id))

  if (isRoot) {
    const accentColor = settings.accentColor ?? defaults.accentColor
    const grayColor = settings.grayColor ?? defaults.grayColor
    attributes.push(
      h.DataAttribute('is-root-theme', 'true'),
      h.DataAttribute('accent-color', accentColor),
      h.DataAttribute('gray-color', grayColor === 'auto' ? grayMatch[accentColor] : grayColor),
      h.DataAttribute('radius', settings.radius ?? defaults.radius),
      h.DataAttribute('scaling', settings.scaling ?? defaults.scaling),
      h.DataAttribute('has-background', String(settings.hasBackground ?? defaults.hasBackground)),
      h.DataAttribute('panel-background', settings.panelBackground ?? defaults.panelBackground),
    )
  } else {
    if (settings.accentColor !== undefined) attributes.push(h.DataAttribute('accent-color', settings.accentColor))
    if (settings.accentColor !== undefined || settings.grayColor !== undefined) {
      const grayColor = settings.grayColor === undefined || settings.grayColor === 'auto'
        ? settings.accentColor === undefined ? undefined : grayMatch[settings.accentColor]
        : settings.grayColor
      if (grayColor !== undefined) attributes.push(h.DataAttribute('gray-color', grayColor))
    }
    if (settings.radius !== undefined) attributes.push(h.DataAttribute('radius', settings.radius))
    if (settings.scaling !== undefined) attributes.push(h.DataAttribute('scaling', settings.scaling))
    if (settings.hasBackground !== undefined) attributes.push(h.DataAttribute('has-background', String(settings.hasBackground)))
    if (settings.panelBackground !== undefined) attributes.push(h.DataAttribute('panel-background', settings.panelBackground))
  }
  const themeChildren = isRoot
    ? [h.div([h.Id('foldkit-portal-root')], []), ...children]
    : children
  return brandViewResult(h.div(attributes, themeChildren), 'wseffect/Theme')
}
