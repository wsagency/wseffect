import '@wsagency/wseffect-themes/tokens/base.css'
import '@wsagency/wseffect-themes/tokens/colors/indigo.css'
import '@wsagency/wseffect-themes/tokens/colors/slate.css'
import '@wsagency/wseffect-themes/tokens/colors/gray.css'
import '@wsagency/wseffect-themes/tokens/colors/red.css'
import '@wsagency/wseffect-themes/tokens/colors/green.css'
import '@wsagency/wseffect-themes/components.css'
import '@wsagency/wseffect-themes/utilities.css'
import './shell.css'
import { makeApp } from '@wsagency/wseffect-app'
import type { KitBinding } from '@wsagency/wseffect-app'
import { run } from 'foldkit/runtime'
import type { Pages } from './pages.gen.js'
import { kit } from './pages.gen.js'
import { Message, Model, init, onUrlChange, onUrlRequest, update, view } from './shell.js'
import type { KitMessageType } from './shell.js'
type DevMessageWindow = Window & { __wseffectMessages?: Array<Message> }

const runtimeInit: typeof init = (url) => {
  if (import.meta.env.DEV) (window as DevMessageWindow).__wseffectMessages = []
  return init(url)
}

const runtimeUpdate: typeof update = import.meta.env.DEV
  ? (model, message) => {
      const messageWindow = window as DevMessageWindow
      const messages = messageWindow.__wseffectMessages ?? (messageWindow.__wseffectMessages = [])
      messages.push(message)
      return update(model, message)
    }
  : update

const application = makeApp<Model, Message, Pages, KitMessageType>({
  Model,
  init: runtimeInit,
  update: runtimeUpdate,
  view,
  container: document.getElementById('app')!,
  routing: { onUrlRequest, onUrlChange },
  kit: {
    binding: kit as KitBinding<Pages, KitMessageType>,
    read: (model) => model.kit,
    toParentMessage: (message) => Message.GotKitMessage({ message }),
  },
})

run(application)
