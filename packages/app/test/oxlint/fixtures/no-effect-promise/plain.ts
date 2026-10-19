import { Effect } from 'effect'

export const promise = Effect.promise(() => fetch('/'))
