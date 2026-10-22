import { Schema } from 'effect'
import { pageContract } from '@wsagency/wseffect-app'
import * as Theme from '@wsagency/wseffect-themes/components/theme'
import { defineMessageUnion } from 'foldkit/message'

export type PageInputs = Readonly<{
  path: string
  date: string
  accentColor: Theme.Settings['accentColor']
  grayColor: Theme.Settings['grayColor']
  radius: Theme.Settings['radius']
  scaling: Theme.Settings['scaling']
  appearance: Theme.Settings['appearance']
  panelBackground: Theme.Settings['panelBackground']
}>

export const themeSettingsFrom = (inputs: PageInputs): Theme.Settings => ({
  accentColor: inputs.accentColor,
  grayColor: inputs.grayColor,
  radius: inputs.radius,
  scaling: inputs.scaling,
  appearance: inputs.appearance,
  panelBackground: inputs.panelBackground,
  hasBackground: true,
})

export const PageOutMessage = defineMessageUnion({
  RequestedShiftDay: { days: Schema.Number },
  ChangedThemeSetting: {
    setting: Schema.Literals(['accentColor', 'grayColor', 'radius', 'scaling', 'appearance', 'panelBackground', 'hasBackground']),
    value: Schema.String,
  },
})

export type PageOutMessage = typeof PageOutMessage.Type
export const galleryPageContract = pageContract<PageInputs, PageOutMessage>({ OutMessage: PageOutMessage })
