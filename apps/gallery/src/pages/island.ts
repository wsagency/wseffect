import { Effect, Queue, Schema } from 'effect'
import * as Stream from 'effect/Stream'
import { Command, Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Island, type IslandPatch } from '@wsagency/wseffect-app'
import { Button, Heading, Text } from '@wsagency/wseffect-themes'
import { galleryPageContract, type PageInputs } from '../contract.js'

const IslandResultSchema = Schema.Union([
  Schema.Struct({ _tag: Schema.Literal('Applied') }),
  Schema.Struct({ _tag: Schema.Literal('RejectedIslandPatch'), reason: Schema.String }),
])
export const Model = Schema.Struct({ status: Schema.String, results: Schema.Array(Schema.String) })
export const Message = defineMessageUnion({
  ApplyInsidePatch: {},
  ApplyOutsidePatch: {},
  IslandUpdated: { result: IslandResultSchema },
  PatchRequested: {},
})
type Model = typeof Model.Type
type Message = typeof Message.Type
let offerPatch: ((patch: IslandPatch) => void) | undefined
let patchStream: Stream.Stream<IslandPatch> | undefined
const patches = () => patchStream ??= Stream.callback<IslandPatch>((queue) => Effect.sync(() => {
  offerPatch = (patch) => Queue.offerUnsafe(queue, patch)
  return () => { offerPatch = undefined }
}))
const requestPatch = (patch: IslandPatch): Command.Command<Message, never> => ({
  name: 'RequestIslandPatch',
  effect: Effect.sync(() => {
    offerPatch?.(patch)
    return Message.PatchRequested()
  }),
})

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({ model: { status: 'Trusted server-owned Island is static until patched', results: [] } }),
  update: (model: Model, message: Message) => Message.match(message, {
    ApplyInsidePatch: () => ({ model, commands: [requestPatch({ _tag: 'InnerHtml', selector: '#trusted-message', html: 'Updated by scripted Island patch' })] }),
    ApplyOutsidePatch: () => ({ model, commands: [requestPatch({ _tag: 'OuterHtml', selector: '#outside-island', html: '<p>Changed outside content</p>' })] }),
    PatchRequested: () => ({ model: { ...model, status: 'Patch requested' } }),
    IslandUpdated: ({ result }) => {
      const status = result._tag === 'Applied' ? 'Applied' : `RejectedIslandPatch: ${result.reason}`
      return { model: { ...model, status, results: [...model.results, status] } }
    },
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => h.div([h.Class('capability-stack')], [
    Heading.view({ as: 'h1' }, ['Explicit Island'], h),
    Text.view({ as: 'p' }, ['This component is an opt-in boundary for trusted server-owned static HTML, not a general rendering alternative.'], h),
    h.section([h.Id('trusted-island-region'), h.AriaLabel('Trusted server-owned Island'), h.Class('capability-island-region')], [
      Text.view({ as: 'p', size: '2', weight: 'medium' }, ['Island root · trusted server-owned HTML'], h),
      Island({
        id: 'trusted-island',
        html: '<p id="trusted-message" class="rt-Text">Trusted server-owned Island</p>',
        patches: patches(),
        toMessage: (result) => Message.IslandUpdated({ result }),
      }, h),
    ]),
    h.div([h.Class('capability-actions')], [
      h.div([h.Id('island-apply-inside')], [
        Button.view({ type: 'button', onClick: Message.ApplyInsidePatch() }, ['Apply in-island patch'], h),
      ]),
      h.div([h.Id('island-apply-outside')], [
        Button.view({ type: 'button', variant: 'soft', onClick: Message.ApplyOutsidePatch() }, ['Apply out-of-root patch'], h),
      ]),
    ]),
    h.div([h.Id('island-status'), h.AriaLive('polite')], [
      Text.view({
        as: 'p',
        color: model.status === 'Applied' ? 'green' : model.status.startsWith('RejectedIslandPatch:') ? 'red' : 'gray',
      }, [model.status], h),
    ]),
    h.div([h.Id('outside-island')], [Text.view({ as: 'p' }, ['Outside content unchanged'], h)]),
    h.div([h.Id('island-log'), h.AriaLive('polite'), h.Class('capability-result-log')], model.results.map((result) => h.p([], [
      Text.view({ as: 'span', color: result === 'Applied' ? 'green' : 'red' }, [result], h),
    ]))),
  ])),
})
