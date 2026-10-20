import { Effect } from 'effect'
import type { Command } from 'foldkit'

export type BrowserCommandResult =
  | { readonly _tag: 'Succeeded' }
  | { readonly _tag: 'Failed'; readonly reason: string }

/** Uses the browser Clipboard API, which generally requires a secure context and user activation; permission policy cannot be bypassed. */
export function clipboardCommand<M>(text: string, toMessage: (result: BrowserCommandResult) => M): Command.Command<M, never> {
  const effect = Effect.map(
    Effect.tryPromise({
      try: () => {
        if (typeof navigator === 'undefined' || navigator.clipboard === undefined) {
          throw new Error('Clipboard API unavailable')
        }
        if (globalThis.isSecureContext === false) throw new Error('Clipboard requires a secure context')
        return navigator.clipboard.writeText(text)
      },
      catch: (error) => error instanceof Error ? error.message : String(error),
    }),
    () => toMessage({ _tag: 'Succeeded' } as const),
  ).pipe(Effect.catch((reason) => Effect.succeed(toMessage({ _tag: 'Failed', reason }))))
  return { name: 'Clipboard', effect } as Command.Command<M, never>
}
