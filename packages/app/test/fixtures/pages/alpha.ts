import { Effect, Option, Schema } from 'effect'
import { Command, Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { pageContract } from '../../../src/contract.js'

const OutMessage = defineMessageUnion({ ShiftDay: { days: Schema.Number } })
const contract = pageContract({ OutMessage })
export const Model = Schema.Struct({ maybeNote: Schema.Option(Schema.String) })
export const Message = defineMessageUnion({ AlphaPing: {} })
export const AlphaInit = Command.define('AlphaInit', {
  messages: [Message.AlphaPing],
  execute: Effect.succeed(Message.AlphaPing()),
})

export const alphaPage = contract.definePage({
  Model,
  Message,
  init: () => ({ model: { maybeNote: Option.none() }, commands: [AlphaInit()] }),
  update: (model, message) => Message.match(message, {
    AlphaPing: () => ({ model, outMessage: OutMessage.ShiftDay({ days: 1 }) }),
  }),
  view: Submodel.defineView<typeof Model.Type, typeof Message.Type, {}>((model, _inputs, h) =>
    h.div([], [Option.match(model.maybeNote, { onNone: () => '(none)', onSome: (note) => note })]),
  ),
})

export { OutMessage }
