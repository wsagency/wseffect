import { Effect, Result, Schema } from 'effect'
import { Command, Mount, Submodel } from 'foldkit'
import * as Stream from 'effect/Stream'
import { defineMessageUnion } from 'foldkit/message'
import { persist, type PersistenceFailure } from '@wsagency/wseffect-app'
import { Button, Flex, Heading, Text, TextField } from '@wsagency/wseffect-themes'
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

const makeStore = () => persist({
  key: 'gallery-capabilities-persist', version: 1, schema: storedValue,
  defaultValue: '', conflictPolicy: 'local-wins', debounceMs: 100,
  migrate: (_version, data) => Result.succeed(String(data)),
  toMessage: (value): Message => Message.Restored({ value }),
  toFailureMessage: (failure: PersistenceFailure): Message => Message.PersistenceFailed({ operation: failure.operation, reason: failure.reason }),
})
let storeInstance: ReturnType<typeof makeStore> | undefined
const store = () => storeInstance ??= makeStore()
const persistenceMount: Mount.MountAction<Message> = {
  name: 'GalleryCapabilityPersistence',
  f: () => Stream.map(store().subscribe, (message) => message),
}
const save = (value: string): Command.Command<Message, never> => ({
  name: 'SaveCapabilityValue', effect: Effect.as(store().save(value), Message.Saved()),
})
const restore = (): Command.Command<Message, never> => ({
  name: 'RestoreCapabilityValue', effect: Effect.map(store().restore, (value) => Message.Restored({ value })),
})

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({ model: { value: '', status: 'Ready' } }),
  update: (model: Model, message: Message) => Message.match(message, {
    ValueChanged: ({ value }) => ({ model: { ...model, value } }),
    Save: () => ({ model: { ...model, status: 'Saving' }, commands: [save(model.value)] }),
    Restore: () => ({ model: { ...model, status: 'Restoring' }, commands: [restore()] }),
    Saved: () => ({ model: { ...model, status: 'Saved' } }),
    Restored: ({ value }) => ({ model: { ...model, value, status: 'Restored' } }),
    PersistenceFailed: ({ operation, reason }) => ({ model: { ...model, status: `Persistence failure (${operation}): ${reason}` } }),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => h.div([h.OnMount(persistenceMount), h.Class('capability-stack')], [
    Heading.view({ as: 'h1' }, ['Persistence'], h),
    Flex.view({ direction: 'column', gap: '2' }, [
      h.div([h.Class('capability-field')], [
        TextField.view({
          id: 'persistence-value',
          label: 'Saved value',
          type: 'text',
          value: model.value,
          onInput: (value) => Message.ValueChanged({ value }),
        }, [], h),
      ]),
      h.div([h.Class('capability-actions')], [
        Button.view({ type: 'button', onClick: Message.Save() }, ['Save value'], h),
        Button.view({ type: 'button', variant: 'soft', onClick: Message.Restore() }, ['Restore value'], h),
      ]),
      h.div([h.Id('persistence-status'), h.AriaLive('polite')], [
        Text.view({
          as: 'p',
          color: model.status.startsWith('Persistence failure') ? 'red' : model.status === 'Saved' || model.status === 'Restored' ? 'green' : 'gray',
        }, [model.status], h),
      ]),
    ], h),
  ])),
})
