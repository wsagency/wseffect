import '@wsagency/wseffect-themes/tokens/colors/red.css'
import '@wsagency/wseffect-themes/tokens/colors/green.css'
import { Schema } from 'effect'
import { Mount, Submodel } from '@wsagency/wseffect-foldkit'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import { signalSubscription } from '@wsagency/wseffect-app'
import { Button, Heading, Text } from '@wsagency/wseffect-themes'
import { galleryPageContract, type PageInputs } from '../contract.js'
const Signal = Schema.Struct({ count: Schema.Number })
const SignalOutcomeSchema = Schema.Union([
  Schema.Struct({ _tag: Schema.Literal('SignalPatch'), value: Signal, onlyIfMissing: Schema.Boolean }),
  Schema.Struct({ _tag: Schema.Literal('RejectedSignalPatch'), reason: Schema.Literals(['MalformedJson', 'UnsupportedEvent', 'UnsupportedOperation', 'SchemaFailure']) }),
  Schema.Struct({ _tag: Schema.Literal('SignalTransportFailure'), reason: Schema.Literals(['Network', 'Interrupted']) }),
])
export const Model = Schema.Struct({ count: Schema.Number, connected: Schema.Boolean, status: Schema.String })
export const Message = defineMessageUnion({
  Connect: {},
  SignalOutcomeReceived: { outcome: SignalOutcomeSchema },
})
type Model = typeof Model.Type
type Message = typeof Message.Type

const signalMount: Mount.MountAction<Message> = {
  name: 'GalleryCapabilitySignals',
  f: () => signalSubscription({
    schema: Signal,
    transport: { _tag: 'EventSource', url: '/__gallery/capabilities/signals' },
    backoff: { delaysMs: [10_000], jitter: 0 },
    toMessage: (outcome): Message => Message.SignalOutcomeReceived({ outcome }),
  }).dependenciesToStream({}, () => ({})),
}

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({ model: { count: 0, connected: false, status: 'Waiting for a signal' } }),
  update: (model: Model, message: Message) => Message.match(message, {
    Connect: () => ({ model: { ...model, connected: true, status: 'Connecting to local EventSource' } }),
    SignalOutcomeReceived: ({ outcome }) => outcome._tag === 'SignalPatch'
      ? { model: { ...model, count: outcome.onlyIfMissing ? model.count : outcome.value.count, status: 'Signal patch applied' } }
      : { model: { ...model, status: outcome._tag === 'RejectedSignalPatch' ? `Rejected signal: ${outcome.reason}` : `Signal transport: ${outcome.reason}` } },
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => h.div([h.Class('capability-stack')], [
    Heading.view({ as: 'h1' }, ['Signals'], h),
    h.div([h.Id('signal-count'), h.Class('rt-Text rt-r-size-6 rt-r-weight-bold')], [String(model.count)]),
    h.div([h.Id('signal-status'), h.AriaLive('polite')], [
      Text.view({
        as: 'p',
        color: model.status === 'Signal patch applied' ? 'green' : model.status.startsWith('Rejected') || model.status.startsWith('Signal transport') ? 'red' : 'gray',
      }, [model.status], h),
    ]),
    ...(model.connected
      ? [h.div([h.OnMount(signalMount)], [])]
      : [Button.view({ type: 'button', onClick: Message.Connect() }, ['Connect to local signal stream'], h)]),
  ])),
})
