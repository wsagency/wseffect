import { Effect, Result, Schema } from 'effect'
import { Command, Mount, Submodel } from 'foldkit'
import * as Stream from 'effect/Stream'
import { defineMessageUnion } from 'foldkit/message'
import { persist, type PersistenceFailure } from '@wsagency/wseffect-app'
import { Heading } from '@wsagency/wseffect-themes'
import { galleryPageContract, type PageInputs } from '../contract.js'

const storedValue = Schema.String
export const Model = Schema.Struct({ value: Schema.String, status: Schema.String })
export const Message = defineMessageUnion({
  ValueChanged: { value: Schema.String },
  Save: {},
  Restore: {},
  Saved: {},
  Restored: { value: Schema.String },
  PersistenceFailed: { operation: Schema.Literals(['Restore', 'Save', 'Migrate', 'Sync']), reason: Schema.String },
})
type Model = typeof Model.Type
type Message = typeof Message.Type

const store = persist({
  key: 'gallery-capabilities-persist', version: 1, schema: storedValue,
  defaultValue: '', conflictPolicy: 'local-wins', debounceMs: 100,
  migrate: (_version, data) => Result.succeed(String(data)),
  toMessage: (value): Message => Message.Restored({ value }),
  toFailureMessage: (failure: PersistenceFailure): Message => Message.PersistenceFailed({ operation: failure.operation, reason: failure.reason }),
})
const persistenceMount: Mount.MountAction<Message> = {
  name: 'GalleryCapabilityPersistence',
  f: () => Stream.map(store.subscribe, (message) => message),
}
const save = (value: string): Command.Command<Message, never> => ({
  name: 'SaveCapabilityValue', effect: Effect.as(store.save(value), Message.Saved()),
})
const restore: Command.Command<Message, never> = {
  name: 'RestoreCapabilityValue', effect: Effect.map(store.restore, (value) => Message.Restored({ value })),
}

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({ model: { value: '', status: 'Ready' } }),
  update: (model: Model, message: Message) => Message.match(message, {
    ValueChanged: ({ value }) => ({ model: { ...model, value } }),
    Save: () => ({ model: { ...model, status: 'Saving' }, commands: [save(model.value)] }),
    Restore: () => ({ model: { ...model, status: 'Restoring' }, commands: [restore] }),
    Saved: () => ({ model: { ...model, status: 'Saved' } }),
    Restored: ({ value }) => ({ model: { ...model, value, status: 'Restored' } }),
    PersistenceFailed: ({ operation, reason }) => ({ model: { ...model, status: `Persistence failure (${operation}): ${reason}` } }),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => h.div([h.OnMount(persistenceMount)], [
    Heading.view({ as: 'h1' }, ['Persistence'], h),
    h.label([h.For('persistence-value')], ['Saved value']),
    h.input([h.Id('persistence-value'), h.Type('text'), h.Value(model.value), h.OnInput((value) => Message.ValueChanged({ value }))]),
    h.button([h.OnClick(Message.Save())], ['Save value']),
    h.button([h.OnClick(Message.Restore())], ['Restore value']),
    h.p([h.Id('persistence-status'), h.AriaLive('polite')], [model.status]),
  ])),
})
