import { Command, Effect } from 'effect'

export const M = {}
export const X = Command.define('X', {
  messages: [M],
  execute: Effect.tryPromise(() => fetch('/')).pipe(Effect.match({
    onFailure: () => M,
    onSuccess: () => M,
  })),
})
