import '@wsagency/wseffect-themes/tokens/colors/amber.css'
import '@wsagency/wseffect-themes/tokens/colors/blue.css'
import '@wsagency/wseffect-themes/tokens/colors/bronze.css'
import '@wsagency/wseffect-themes/tokens/colors/brown.css'
import '@wsagency/wseffect-themes/tokens/colors/crimson.css'
import '@wsagency/wseffect-themes/tokens/colors/cyan.css'
import '@wsagency/wseffect-themes/tokens/colors/gold.css'
import '@wsagency/wseffect-themes/tokens/colors/grass.css'
import '@wsagency/wseffect-themes/tokens/colors/green.css'
import '@wsagency/wseffect-themes/tokens/colors/iris.css'
import '@wsagency/wseffect-themes/tokens/colors/jade.css'
import '@wsagency/wseffect-themes/tokens/colors/lime.css'
import '@wsagency/wseffect-themes/tokens/colors/mauve.css'
import '@wsagency/wseffect-themes/tokens/colors/mint.css'
import '@wsagency/wseffect-themes/tokens/colors/olive.css'
import '@wsagency/wseffect-themes/tokens/colors/orange.css'
import '@wsagency/wseffect-themes/tokens/colors/pink.css'
import '@wsagency/wseffect-themes/tokens/colors/plum.css'
import '@wsagency/wseffect-themes/tokens/colors/purple.css'
import '@wsagency/wseffect-themes/tokens/colors/red.css'
import '@wsagency/wseffect-themes/tokens/colors/ruby.css'
import '@wsagency/wseffect-themes/tokens/colors/sage.css'
import '@wsagency/wseffect-themes/tokens/colors/sand.css'
import '@wsagency/wseffect-themes/tokens/colors/sky.css'
import '@wsagency/wseffect-themes/tokens/colors/teal.css'
import '@wsagency/wseffect-themes/tokens/colors/tomato.css'
import '@wsagency/wseffect-themes/tokens/colors/violet.css'
import '@wsagency/wseffect-themes/tokens/colors/yellow.css'
import { Schema } from 'effect'
import { Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as Button from '@wsagency/wseffect-themes/components/button'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import * as Theme from '@wsagency/wseffect-themes/components/theme'
import { galleryPageContract, type PageInputs, PageOutMessage } from '../contract.js'

export const Model = Schema.Struct({})
export const Message = defineMessageUnion({
  ChangeAccent: {},
  ChangeGray: {},
  ChangeRadius: {},
  ChangeScaling: {},
  ChangeAppearance: {},
  ChangePanelBackground: {},
})
type Model = typeof Model.Type
type Message = typeof Message.Type

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({ model: {} }),
  update: (model: Model, message: Message) => Message.match(message, {
    ChangeAccent: () => ({ model, outMessage: PageOutMessage.ChangedThemeSetting({ setting: 'accentColor', value: 'crimson' }) }),
    ChangeGray: () => ({ model, outMessage: PageOutMessage.ChangedThemeSetting({ setting: 'grayColor', value: 'gray' }) }),
    ChangeRadius: () => ({ model, outMessage: PageOutMessage.ChangedThemeSetting({ setting: 'radius', value: 'large' }) }),
    ChangeScaling: () => ({ model, outMessage: PageOutMessage.ChangedThemeSetting({ setting: 'scaling', value: '105%' }) }),
    ChangeAppearance: () => ({ model, outMessage: PageOutMessage.ChangedThemeSetting({ setting: 'appearance', value: 'dark' }) }),
    ChangePanelBackground: () => ({ model, outMessage: PageOutMessage.ChangedThemeSetting({ setting: 'panelBackground', value: 'solid' }) }),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((_model, inputs, h) => h.div([], [
    Heading.view({ as: 'h1' }, ['Theme settings'], h),
    Theme.view({
      id: 'theme-preview',
      isRoot: false,
      settings: {
        accentColor: inputs.accentColor as typeof Theme.Settings.fields.accentColor.Type,
        grayColor: inputs.grayColor as typeof Theme.Settings.fields.grayColor.Type,
        radius: inputs.radius as typeof Theme.Settings.fields.radius.Type,
        scaling: inputs.scaling as typeof Theme.Settings.fields.scaling.Type,
        appearance: inputs.appearance,
        panelBackground: inputs.panelBackground,
      },
    }, [h.p([], ['Preview of the current theme settings.'])], h),
    Button.view({ onClick: Message.ChangeAccent() }, ['Accent color'], h),
    Button.view({ onClick: Message.ChangeGray() }, ['Gray color'], h),
    Button.view({ onClick: Message.ChangeRadius() }, ['Radius'], h),
    Button.view({ onClick: Message.ChangeScaling() }, ['Scaling'], h),
    Button.view({ onClick: Message.ChangeAppearance() }, ['Appearance'], h),
    Button.view({ onClick: Message.ChangePanelBackground() }, ['Panel background'], h),
  ])),
})
