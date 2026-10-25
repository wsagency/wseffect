import { Effect, Schema } from 'effect'
import * as Command from '@wsagency/wseffect-foldkit/command'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import type * as Update from '@wsagency/wseffect-foldkit/update'

export type GroupConfig = Readonly<{ openDelay: number; skipDelay: number }>

export const Model = Schema.Struct({
  isSkipping: Schema.Boolean,
  expiryVersion: Schema.Number,
  skipDelay: Schema.Number,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  TooltipOpened: { now: Schema.Number },
  TooltipClosed: { now: Schema.Number },
  SkipExpired: { version: Schema.Number },
})
export type Message = typeof Message.Type

const DEFAULT_CONFIG: GroupConfig = { openDelay: 700, skipDelay: 300 }

export const SkipDelay = Command.define('TooltipGroupSkipDelay', {
  args: { version: Schema.Number, delay: Schema.Number },
  messages: [Message.SkipExpired],
  execute: ({ version, delay }) =>
    Effect.sleep(delay).pipe(Effect.as(Message.SkipExpired({ version }))),
})

export const init = (config: GroupConfig = DEFAULT_CONFIG): Model => ({
  isSkipping: false,
  expiryVersion: 0,
  skipDelay: config.skipDelay,
})

export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'TooltipOpened':
    case 'TooltipClosed': {
      const expiryVersion = model.expiryVersion + 1
      return {
        model: { ...model, isSkipping: true, expiryVersion },
        commands: [
          SkipDelay({ version: expiryVersion, delay: model.skipDelay }),
        ],
      }
    }
    case 'SkipExpired':
      return message.version === model.expiryVersion
        ? { model: { ...model, isSkipping: false } }
        : { model }
  }
}

export const reflectShowDelay = (
  model: Model,
  config: GroupConfig = DEFAULT_CONFIG,
): number => (model.isSkipping ? 0 : config.openDelay)
