import { Effect } from 'effect'
import type { Command } from '@wsagency/wseffect-foldkit'
import type { BrowserCommandResult } from './clipboard.js'

export function scrollIntoViewCommand<M>(id: string, options: ScrollIntoViewOptions, toMessage: (result: BrowserCommandResult) => M): Command.Command<M, never> {
  const effect = Effect.sync(() => {
    try {
      const target = typeof document === 'undefined' ? null : document.getElementById(id)
      if (target === null) return toMessage({ _tag: 'Failed', reason: `No element with id "${id}"` })
      target.scrollIntoView(options)
      return toMessage({ _tag: 'Succeeded' })
    } catch (error) {
      return toMessage({ _tag: 'Failed', reason: error instanceof Error ? error.message : String(error) })
    }
  })
  return { name: 'ScrollIntoView', effect } as Command.Command<M, never>
}
