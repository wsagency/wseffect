import { Effect, Queue, Stream } from 'effect'
import type { Mount } from 'foldkit'

export type ResizeResult =
  | { readonly _tag: 'Resized'; readonly width: number; readonly height: number }
  | { readonly _tag: 'ResizeUnavailable' | 'ResizeFailure'; readonly reason?: string }

type FrameHost = {
  readonly requestAnimationFrame?: (callback: FrameRequestCallback) => number
  readonly cancelAnimationFrame?: (handle: number) => void
}

export function resizeObserverMount<M>(toMessage: (result: ResizeResult) => M): Mount.MountAction<M> {
  return {
    name: 'ResizeObserver',
    f: (element) => {
      if (typeof ResizeObserver === 'undefined') return Stream.make(toMessage({ _tag: 'ResizeUnavailable' }))
      return Stream.callback<M>((queue) => Effect.gen(function* () {
        const frameHost = globalThis as FrameHost
        let active = true
        let frame: number | undefined
        let nextWidth: number | undefined
        let nextHeight: number | undefined
        let lastWidth: number | undefined
        let lastHeight: number | undefined
        let observer: ResizeObserver | undefined
        const flush = () => {
          frame = undefined
          if (!active || nextWidth === undefined || nextHeight === undefined) return
          const width = nextWidth
          const height = nextHeight
          nextWidth = undefined
          nextHeight = undefined
          if (width === lastWidth && height === lastHeight) return
          lastWidth = width
          lastHeight = height
          Queue.offerUnsafe(queue, toMessage({ _tag: 'Resized', width, height }))
        }
        const onResize: ResizeObserverCallback = (entries) => {
          const entry = entries[entries.length - 1]
          if (entry === undefined) return
          nextWidth = entry.contentRect.width
          nextHeight = entry.contentRect.height
          if (frame === undefined) {
            frame = frameHost.requestAnimationFrame === undefined
              ? setTimeout(flush, 0) as unknown as number
              : frameHost.requestAnimationFrame(flush)
          }
        }
        try {
          observer = new ResizeObserver(onResize)
          observer.observe(element)
        } catch (error) {
          Queue.offerUnsafe(queue, toMessage({ _tag: 'ResizeFailure', reason: error instanceof Error ? error.message : String(error) }))
        }
        yield* Effect.acquireRelease(
          Effect.sync(() => observer),
          (ownedObserver) => Effect.sync(() => {
            active = false
            if (frame !== undefined) {
              if (frameHost.cancelAnimationFrame !== undefined) frameHost.cancelAnimationFrame(frame)
              else clearTimeout(frame)
            }
            ownedObserver?.disconnect()
          }),
        )
        return yield* Effect.never
      }))
    },
  }
}
