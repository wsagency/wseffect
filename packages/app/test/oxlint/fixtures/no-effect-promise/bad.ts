import { Command, Effect } from 'effect'

export const M = {}
export const X = Command.define('X', {
  messages: [M],
  execute: Effect.promise(() => fetch('/')),
})
