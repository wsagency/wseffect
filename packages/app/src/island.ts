import { Effect, Stream } from 'effect'
import type { Mount } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

export type IslandPatch =
  | { readonly _tag: 'OuterHtml'; readonly selector: string; readonly html: string }
  | { readonly _tag: 'InnerHtml'; readonly selector: string; readonly html: string }

export type IslandResult =
  | { readonly _tag: 'Applied' }
  | { readonly _tag: 'RejectedIslandPatch'; readonly reason: string }

type FocusableElement = Element & Pick<HTMLInputElement, 'focus' | 'selectionStart' | 'selectionEnd' | 'selectionDirection' | 'setSelectionRange'>

type FocusSnapshot = Readonly<{
  path: ReadonlyArray<number>
  selection?: readonly [number, number, Exclude<HTMLInputElement['selectionDirection'], null> | undefined]
}>

function captureFocus(target: Element): FocusSnapshot | undefined {
  const activeElement = document.activeElement
  if (activeElement === null || (activeElement !== target && !target.contains(activeElement))) return undefined

  const path: number[] = []
  let node: Node = activeElement
  while (node !== target) {
    const parent = node.parentNode
    if (parent === null) return undefined
    const index = Array.prototype.indexOf.call(parent.childNodes, node) as number
    if (index < 0) return undefined
    path.push(index)
    node = parent
  }
  path.reverse()

  let selection: FocusSnapshot['selection']
  try {
    const input = activeElement as FocusableElement
    const start = input.selectionStart
    const end = input.selectionEnd
    if (start !== null && end !== null) selection = [start, end, input.selectionDirection ?? undefined]
  } catch {}
  return selection === undefined ? { path } : { path, selection }
}

function restoreFocus(target: Element, snapshot: FocusSnapshot | undefined): void {
  if (snapshot === undefined) return
  let node: Node = target
  for (const index of snapshot.path) {
    const child = node.childNodes.item(index)
    if (child === null) return
    node = child
  }
  const focusable = node as FocusableElement
  try {
    focusable.focus?.({ preventScroll: true })
    if (snapshot.selection !== undefined) focusable.setSelectionRange?.(...snapshot.selection)
  } catch {}
}

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
          const snapshot = target.cloneNode(true) as Element
          const parent = target.parentNode
          const previousSibling = target.previousSibling
          const nextSibling = target.nextSibling
          const focusSnapshot = captureFocus(target)
          try {
            await Idiomorph.morph(target, patch.html, {
              morphStyle: patch._tag === 'OuterHtml' ? 'outerHTML' : 'innerHTML',
              ignoreActiveValue: true,
              restoreFocus: true,
            })
          } catch {
            if (patch._tag === 'InnerHtml') {
              target.replaceChildren(...Array.from(snapshot.childNodes))
              restoreFocus(target, focusSnapshot)
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
              restoreFocus(snapshot, focusSnapshot)
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
