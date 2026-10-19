import { Schema } from 'effect'
import { pageContract } from '@wsagency/wseffect-app'
import { Theme } from '@wsagency/wseffect-themes'
import { defineMessageUnion } from 'foldkit/message'

export type PageInputs = Readonly<{
  date: string
  accentColor: Theme.Settings['accentColor']
  grayColor: Theme.Settings['grayColor']
  radius: Theme.Settings['radius']
  scaling: Theme.Settings['scaling']
  appearance: Theme.Settings['appearance']
  panelBackground: Theme.Settings['panelBackground']
}>

export const PageOutMessage = defineMessageUnion({
  RequestedShiftDay: { days: Schema.Number },
  ChangedThemeSetting: {
    setting: Schema.Literals(['accentColor', 'grayColor', 'radius', 'scaling', 'appearance', 'panelBackground']),
    value: Schema.String,
  },
})

export type PageOutMessage = typeof PageOutMessage.Type
export const galleryPageContract = pageContract<PageInputs, PageOutMessage>({ OutMessage: PageOutMessage })
