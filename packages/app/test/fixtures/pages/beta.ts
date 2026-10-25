import { Schema } from 'effect'
import { Submodel } from '@wsagency/wseffect-foldkit'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import { pageContract } from '../../../src/contract.js'

const OutMessage = defineMessageUnion({ ShiftDay: { days: Schema.Number } })
const contract = pageContract({ OutMessage })
export const Model = Schema.Struct({ count: Schema.Number })
export const Message = defineMessageUnion({ BetaPing: {} })

export const betaPage = contract.definePage({
  Model,
  Message,
  init: () => ({ model: { count: 0 } }),
  update: (model) => ({ model }),
  view: Submodel.defineView<typeof Model.Type, typeof Message.Type, {}>((model, _inputs, h) =>
    h.div([], [String(model.count)]),
  ),
})
