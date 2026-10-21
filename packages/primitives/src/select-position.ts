import { Effect, Queue, Stream } from 'effect'
import type * as Mount from 'foldkit/mount'

export type SelectPositionConfig = {
  panelId: string
  triggerId: string
  selectedItemId: string
  activeItemId?: string
}
export type SelectPositionMessage = { _tag: 'Positioned' } | { _tag: 'PositionFailed' }

export function mountSelectPosition(config: SelectPositionConfig): Mount.MountAction<SelectPositionMessage> {
  return {
    name: 'SelectPosition',
    f: () => Stream.callback<SelectPositionMessage>(queue => Effect.gen(function* () {
      const panel = document.getElementById(config.panelId)
      const trigger = document.getElementById(config.triggerId)
      const item = document.getElementById(config.activeItemId ?? config.selectedItemId)
      if (panel === null || trigger === null || item === null) {
        yield* Queue.offer(queue, { _tag: 'PositionFailed' })
        return
      }
      const position = () => {
        const triggerRect = trigger.getBoundingClientRect()
        const panelRect = panel.getBoundingClientRect()
        const itemRect = item.getBoundingClientRect()
        panel.style.position = 'fixed'
        panel.style.left = `${triggerRect.left}px`
        panel.style.top = `${triggerRect.top - (itemRect.top - panelRect.top)}px`
        panel.style.minWidth = `${triggerRect.width}px`
      }
      try {
        position()
      } catch {
        yield* Queue.offer(queue, { _tag: 'PositionFailed' })
        return
      }
      let observer: ResizeObserver | undefined
      try {
        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(position)
          observer.observe(trigger)
          observer.observe(panel)
          observer.observe(item)
        }
      } catch {
        observer?.disconnect()
        yield* Queue.offer(queue, { _tag: 'PositionFailed' })
        return
      }
      yield* Effect.acquireRelease(Effect.succeed(observer), current => Effect.sync(() => current?.disconnect()))
      yield* Queue.offer(queue, { _tag: 'Positioned' })
      return yield* Effect.never
    })),
  }
}
