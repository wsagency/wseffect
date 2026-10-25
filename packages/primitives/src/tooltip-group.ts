import { Effect, Schema } from 'effect'
import * as Command from '@wsagency/wseffect-foldkit/command'
import type * as Update from '@wsagency/wseffect-foldkit/update'

export type Config = { openDelay: 700; skipDelay: 300 }
export const Model = Schema.Struct({ isSkipping: Schema.Boolean, expiryVersion: Schema.Number })
export type Model = typeof Model.Type
export const Message = Schema.Union([
  Schema.Struct({ _tag: Schema.Literal('TooltipOpened'), now: Schema.Number }),
  Schema.Struct({ _tag: Schema.Literal('TooltipClosed'), now: Schema.Number }),
  Schema.Struct({ _tag: Schema.Literal('SkipExpired'), version: Schema.Number }),
])
export type Message = typeof Message.Type
export type OutMessage = never

const defaultConfig: Config = { openDelay: 700, skipDelay: 300 }
const SkipDelay = Command.define('TooltipGroupSkipDelay', {
  args: { version: Schema.Number, delay: Schema.Number },
  messages: [Message.members[2]],
  execute: ({ version, delay }) => Effect.sleep(delay).pipe(Effect.as(Message.members[2].make({ _tag: 'SkipExpired', version }))),
})

export function init(config?: Config): Model {
  void config
  return { isSkipping: false, expiryVersion: 0 }
}

export function update(model: Model, message: Message): Update.Return<Model, Message> {
  switch (message._tag) {
    case 'TooltipOpened':
    case 'TooltipClosed': {
      const expiryVersion = model.expiryVersion + 1
      return {
        model: { isSkipping: true, expiryVersion },
        commands: [SkipDelay({ version: expiryVersion, delay: defaultConfig.skipDelay })],
      }
    }
    case 'SkipExpired':
      return message.version === model.expiryVersion
        ? { model: { ...model, isSkipping: false } }
        : { model }
  }
}

export function reflectShowDelay(model: Model): number {
  return model.isSkipping ? 0 : defaultConfig.openDelay
}
