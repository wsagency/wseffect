import { Effect, Stream } from 'effect'
import type { Mount } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

export type IslandPatch =
  | { readonly _tag: 'OuterHtml'; readonly selector: string; readonly html: string }
  | { readonly _tag: 'InnerHtml'; readonly selector: string; readonly html: string }

export type IslandResult =
  | { readonly _tag: 'Applied' }
  | { readonly _tag: 'RejectedIslandPatch'; readonly reason: string }

/** Explicit Foldkit ownership exception for trusted server-rendered HTML; never pass user-controlled raw HTML. */
export function Island<M>(props: {
  readonly id: string
  readonly html: string
  readonly patches: Stream.Stream<IslandPatch>
  readonly toMessage: (result: IslandResult) => M
}, h: HtmlBuilder<M>): Html {
  const action: Mount.MountAction<M> = {
    name: 'IslandPatches',
    f: (root) => Stream.mapEffect(props.patches, (patch) => Effect.tryPromise({
      try: async (signal) => {
        let target: Element | null
        try {
          target = root.querySelector(patch.selector)
        } catch {
          return props.toMessage({ _tag: 'RejectedIslandPatch', reason: 'InvalidSelector' })
        }
        if (target === null) {
          try {
            target = document.querySelector(patch.selector)
          } catch {
            return props.toMessage({ _tag: 'RejectedIslandPatch', reason: 'InvalidSelector' })
          }
          return props.toMessage({ _tag: 'RejectedIslandPatch', reason: target === null ? 'MissingTarget' : 'TargetOutsideIsland' })
        }
        if (target === root || !root.contains(target)) {
          return props.toMessage({ _tag: 'RejectedIslandPatch', reason: 'TargetOutsideIsland' })
        }
        // Keep Idiomorph out of every build that does not mount an Island.
        const { Idiomorph } = await import('idiomorph')
        if (target === root || !root.contains(target)) {
          return props.toMessage({ _tag: 'RejectedIslandPatch', reason: 'TargetOutsideIsland' })
        }
        if (signal.aborted) {
          return props.toMessage({ _tag: 'RejectedIslandPatch', reason: 'Interrupted' })
        }
        await Idiomorph.morph(target, patch.html, {
          morphStyle: patch._tag === 'OuterHtml' ? 'outerHTML' : 'innerHTML',
          ignoreActiveValue: true,
          restoreFocus: true,
        })
        return props.toMessage({ _tag: 'Applied' })
      },
      catch: (error) => error instanceof Error ? error.message : String(error),
    }).pipe(Effect.catch((reason) => Effect.succeed(props.toMessage({ _tag: 'RejectedIslandPatch', reason }))))),
  }
  return h.div([h.Id(props.id), h.InnerHTML(props.html), h.OnMount(action)], [])
}
