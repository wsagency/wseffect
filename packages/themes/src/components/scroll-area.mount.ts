import { Effect, Stream } from 'effect'
import type { Mount } from 'foldkit'
export const mountScrollArea = <Message>(): Mount.MountAction<Message> => ({
  name: 'ScrollAreaSync',
  f: (element) => Stream.callback<Message>(() => Effect.gen(function* () {
    const root = element as HTMLElement
    const viewport = root.querySelector<HTMLElement>('.rt-ScrollAreaViewport')
    if (viewport === null) return yield* Effect.never
    const tracks = Array.from(root.querySelectorAll<HTMLElement>('.rt-ScrollAreaScrollbar'))
    const state = new Map<HTMLElement, { pointerId: number; start: number; scroll: number }>()
    const sync = () => {
      for (const track of tracks) {
        const horizontal = track.dataset.orientation === 'horizontal'
        const viewportSize = horizontal ? viewport.clientWidth : viewport.clientHeight
        const contentSize = horizontal ? viewport.scrollWidth : viewport.scrollHeight
        const trackSize = horizontal ? track.clientWidth : track.clientHeight
        const scrollSize = Math.max(0, contentSize - viewportSize)
        const thumb = track.querySelector<HTMLElement>('.rt-ScrollAreaThumb')
        if (thumb === null) continue
        const hasOverflow = scrollSize > 0 && trackSize > 0
        track.dataset.state = hasOverflow ? 'visible' : 'hidden'
        track.style.display = hasOverflow ? '' : 'none'
        const thumbSize = hasOverflow ? Math.min(trackSize, Math.max(16, trackSize * viewportSize / contentSize)) : trackSize
        const offset = scrollSize > 0 ? (horizontal ? viewport.scrollLeft : viewport.scrollTop) / scrollSize * (trackSize - thumbSize) : 0
        thumb.style.flex = 'none'
        thumb.style.width = horizontal ? `${thumbSize}px` : ''
        thumb.style.height = horizontal ? '' : `${thumbSize}px`
        thumb.style.transform = horizontal ? `translateX(${offset}px)` : `translateY(${offset}px)`
      }
    }
    const coordinate = (event: PointerEvent, horizontal: boolean) => horizontal ? event.clientX : event.clientY
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      const track = target.closest<HTMLElement>('.rt-ScrollAreaScrollbar')
      if (track === null || !root.contains(track)) return
      const thumb = track.querySelector<HTMLElement>('.rt-ScrollAreaThumb')
      if (thumb === null) return
      const horizontal = track.dataset.orientation === 'horizontal'
      if (target === thumb || thumb.contains(target)) {
        state.set(track, { pointerId: event.pointerId, start: coordinate(event, horizontal), scroll: horizontal ? viewport.scrollLeft : viewport.scrollTop })
        thumb.setPointerCapture?.(event.pointerId)
      } else {
        const bounds = track.getBoundingClientRect()
        const position = coordinate(event, horizontal) - (horizontal ? bounds.left : bounds.top)
        const thumbSize = horizontal ? thumb.offsetWidth : thumb.offsetHeight
        const trackSize = horizontal ? track.clientWidth : track.clientHeight
        const ratio = Math.max(0, Math.min(1, (position - thumbSize / 2) / Math.max(1, trackSize - thumbSize)))
        if (horizontal) viewport.scrollLeft = ratio * (viewport.scrollWidth - viewport.clientWidth)
        else viewport.scrollTop = ratio * (viewport.scrollHeight - viewport.clientHeight)
      }
      event.preventDefault()
      sync()
    }
    const onPointerMove = (event: PointerEvent) => {
      for (const [track, drag] of state) {
        if (drag.pointerId !== event.pointerId) continue
        const horizontal = track.dataset.orientation === 'horizontal'
        const thumb = track.querySelector<HTMLElement>('.rt-ScrollAreaThumb')
        if (thumb === null) continue
        const trackSize = horizontal ? track.clientWidth : track.clientHeight
        const thumbSize = horizontal ? thumb.offsetWidth : thumb.offsetHeight
        const scrollRange = horizontal ? viewport.scrollWidth - viewport.clientWidth : viewport.scrollHeight - viewport.clientHeight
        const delta = coordinate(event, horizontal) - drag.start
        const next = drag.scroll + delta * scrollRange / Math.max(1, trackSize - thumbSize)
        if (horizontal) viewport.scrollLeft = next
        else viewport.scrollTop = next
      }
      sync()
    }
    const onPointerUp = (event: PointerEvent) => {
      for (const [track, drag] of state) {
        if (drag.pointerId === event.pointerId) {
          track.querySelector<HTMLElement>('.rt-ScrollAreaThumb')?.releasePointerCapture?.(event.pointerId)
          state.delete(track)
        }
      }
      sync()
    }
    yield* Effect.acquireRelease(
      Effect.sync(() => {
        const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(sync)
        viewport.addEventListener('scroll', sync, { passive: true })
        root.addEventListener('pointerdown', onPointerDown)
        root.addEventListener('pointermove', onPointerMove)
        root.addEventListener('pointerup', onPointerUp)
        root.addEventListener('pointercancel', onPointerUp)
        observer?.observe(viewport)
        for (const track of tracks) observer?.observe(track)
        globalThis.addEventListener('resize', sync)
        sync()
        return () => {
          viewport.removeEventListener('scroll', sync)
          root.removeEventListener('pointerdown', onPointerDown)
          root.removeEventListener('pointermove', onPointerMove)
          root.removeEventListener('pointerup', onPointerUp)
          root.removeEventListener('pointercancel', onPointerUp)
          globalThis.removeEventListener('resize', sync)
          observer?.disconnect()
          state.clear()
        }
      }),
      (cleanup) => Effect.sync(cleanup),
    )
    return yield* Effect.never
  })),
})

