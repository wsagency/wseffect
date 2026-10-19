import { Schema } from 'effect'
import { Submodel } from 'foldkit'
import { pageContract } from '../../../src/contract.js'

const OutMessage = Schema.TaggedStruct('ShiftDay', { days: Schema.Number })
const contract = pageContract({ OutMessage })
export const Model = Schema.Struct({ count: Schema.Number })
export const Message = Schema.TaggedStruct('BetaPing', {})

export const betaPage = contract.definePage({
  Model,
  Message,
  init: () => ({ model: { count: 0 } }),
  update: (model) => ({ model }),
  view: Submodel.defineView<typeof Model.Type, typeof Message.Type, {}>((model, _inputs, h) =>
    h.div([], [String(model.count)]),
  ),
})
