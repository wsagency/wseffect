import { Schema } from 'effect'
import { Mount, Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { signalSubscription } from '@wsagency/wseffect-app'
import { Heading } from '@wsagency/wseffect-themes'
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

const signalStream = signalSubscription({
  schema: Signal,
  transport: { _tag: 'EventSource', url: '/__gallery/capabilities/signals' },
  backoff: { delaysMs: [10_000], jitter: 0 },
  toMessage: (outcome): Message => Message.SignalOutcomeReceived({ outcome }),
})
const signalMount: Mount.MountAction<Message> = {
  name: 'GalleryCapabilitySignals',
  f: () => signalStream.dependenciesToStream({}, () => ({})),
}

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({ model: { count: 0, connected: false, status: 'Waiting for a signal' } }),
  update: (model: Model, message: Message) => Message.match(message, {
    Connect: () => ({ model: { ...model, connected: true, status: 'Connecting to local EventSource' } }),
    SignalOutcomeReceived: ({ outcome }) => outcome._tag === 'SignalPatch'
      ? { model: { ...model, count: outcome.onlyIfMissing && model.count !== 0 ? model.count : outcome.value.count, status: 'Signal patch applied' } }
      : { model: { ...model, status: outcome._tag === 'RejectedSignalPatch' ? `Rejected signal: ${outcome.reason}` : `Signal transport: ${outcome.reason}` } },
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => h.div([], [
    Heading.view({ as: 'h1' }, ['Signals'], h),
    h.p([h.Id('signal-count')], [String(model.count)]),
    h.p([h.Id('signal-status')], [model.status]),
    ...(model.connected ? [h.div([h.OnMount(signalMount)], [])] : [h.button([h.OnClick(Message.Connect())], ['Connect to local signal stream'])]),
  ])),
})
