import { Effect, Queue, Schema } from 'effect'
import * as Stream from 'effect/Stream'
import { Command, Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Island, type IslandPatch } from '@wsagency/wseffect-app'
import { Heading } from '@wsagency/wseffect-themes'
import { galleryPageContract, type PageInputs } from '../contract.js'

const IslandResultSchema = Schema.Union([
  Schema.Struct({ _tag: Schema.Literal('Applied') }),
  Schema.Struct({ _tag: Schema.Literal('RejectedIslandPatch'), reason: Schema.String }),
])
export const Model = Schema.Struct({ status: Schema.String })
export const Message = defineMessageUnion({
  ApplyOutsidePatch: {},
  IslandUpdated: { result: IslandResultSchema },
  PatchRequested: {},
})
type Model = typeof Model.Type
type Message = typeof Message.Type
let offerPatch: ((patch: IslandPatch) => void) | undefined
const patches = Stream.callback<IslandPatch>((queue) => Effect.sync(() => {
  offerPatch = (patch) => Queue.offerUnsafe(queue, patch)
  return () => { offerPatch = undefined }
}))
const requestPatches: Command.Command<Message, never> = {
  name: 'RequestIslandPatches',
  effect: Effect.sync(() => {
    offerPatch?.({ _tag: 'InnerHtml', selector: '#trusted-message', html: 'Updated by scripted Island patch' })
    offerPatch?.({ _tag: 'OuterHtml', selector: '#outside-island', html: '<p>Changed outside content</p>' })
    return Message.PatchRequested()
  }),
}

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({ model: { status: 'Trusted server-owned Island is static until patched' } }),
  update: (model: Model, message: Message) => Message.match(message, {
    ApplyOutsidePatch: () => ({ model, commands: [requestPatches] }),
    PatchRequested: () => ({ model: { ...model, status: 'Scripted patches requested' } }),
    IslandUpdated: ({ result }) => ({ model: { ...model, status: result._tag === 'Applied' ? 'Island patch applied' : `Rejected: ${result.reason}` } }),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => h.div([], [
    Heading.view({ as: 'h1' }, ['Explicit Island'], h),
    h.p([], ['This component is an opt-in boundary for trusted server-owned static HTML, not a general rendering alternative.']),
    Island({
      id: 'trusted-island',
      html: '<p id="trusted-message">Trusted server-owned Island</p>',
      patches,
      toMessage: (result) => Message.IslandUpdated({ result }),
    }, h),
    h.button([h.OnClick(Message.ApplyOutsidePatch())], ['Apply out-of-root patch']),
    h.p([h.Id('island-status'), h.AriaLive('polite')], [model.status]),
    h.p([h.Id('outside-island')], ['Outside content unchanged']),
  ])),
})
