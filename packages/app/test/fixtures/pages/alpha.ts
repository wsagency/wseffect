import { Option, Schema } from 'effect'
import { Submodel } from 'foldkit'
import { pageContract } from '../../../src/contract.js'

const OutMessage = Schema.TaggedStruct('ShiftDay', { days: Schema.Number })
const contract = pageContract({ OutMessage })
export const Model = Schema.Struct({ maybeNote: Schema.Option(Schema.String) })
export const Message = Schema.TaggedStruct('AlphaPing', {})

export const alphaPage = contract.definePage({
  Model,
  Message,
  init: () => ({ model: { maybeNote: Option.none() } }),
  update: (model) => ({ model }),
  view: Submodel.defineView<typeof Model.Type, typeof Message.Type, {}>((model, _inputs, h) =>
    h.div([], [Option.match(model.maybeNote, { onNone: () => '(none)', onSome: (note) => note })]),
  ),
})
