import { Effect, Stream } from 'effect'
import type { Mount } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

export type IslandPatch =
  | { readonly _tag: 'OuterHtml'; readonly selector: string; readonly html: string }
  | { readonly _tag: 'InnerHtml'; readonly selector: string; readonly html: string }

export type IslandResult =
  | { readonly _tag: 'Applied' }
  | { readonly _tag: 'RejectedIslandPatch'; readonly reason: string }

/** Explicit Foldkit ownership exception for trusted server-rendered subtrees; not a general app-rendering path, and never pass user-controlled raw HTML. */
export function Island<M>(props: {
  readonly id: string
  /** Mount-time initialization only. Use a new `id`/key to remount with different server HTML. */
  readonly html: string
  readonly patches: Stream.Stream<IslandPatch>
  readonly toMessage: (result: IslandResult) => M
}, h: HtmlBuilder<M>): Html {
  const action: Mount.MountAction<M> = {
    name: 'IslandPatches',
    f: (root) => {
      root.innerHTML = props.html
      return Stream.mapEffect(props.patches, (patch) => Effect.tryPromise({
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
          const snapshot = target.cloneNode(true)
          const parent = target.parentNode
          const previousSibling = target.previousSibling
          const nextSibling = target.nextSibling
          try {
            await Idiomorph.morph(target, patch.html, {
              morphStyle: patch._tag === 'OuterHtml' ? 'outerHTML' : 'innerHTML',
              ignoreActiveValue: true,
              restoreFocus: true,
            })
          } catch {
            if (patch._tag === 'InnerHtml') {
              target.replaceChildren(...Array.from(snapshot.childNodes))
            } else if (parent !== null) {
              const before = nextSibling?.parentNode === parent ? nextSibling : null
              const afterPrevious = previousSibling?.parentNode === parent ? previousSibling.nextSibling : parent.firstChild
              let node = afterPrevious
              while (node !== null && node !== before) {
                const next = node.nextSibling
                parent.removeChild(node)
                node = next
              }
              parent.insertBefore(snapshot, before)
            }
            return props.toMessage({ _tag: 'RejectedIslandPatch', reason: 'MorphFailed' })
          }
          return props.toMessage({ _tag: 'Applied' })
        },
        catch: (error) => error instanceof Error ? error.message : String(error),
      }).pipe(Effect.catch((reason) => Effect.succeed(props.toMessage({ _tag: 'RejectedIslandPatch', reason }))))
      )
    },
  }
  return h.keyed('div')(props.id, [h.Id(props.id), h.OnMount(action)], [])
}
