import { Effect, Stream } from 'effect'
import type * as Mount from '@wsagency/wseffect-foldkit/mount'

export type SelectPositionConfig = {
  panelId: string
  triggerId: string
  selectedItemId: string
  activeItemId?: string
}

export function mountSelectPosition(config: SelectPositionConfig): Mount.MountAction<never> {
  return {
    name: 'SelectPosition',
    f: element => Stream.callback<never>(() => Effect.gen(function* () {
      const panel = document.getElementById(config.panelId) ?? element as HTMLElement
      const trigger = document.getElementById(config.triggerId)
      if (trigger === null) return
      const item = document.getElementById(config.activeItemId ?? config.selectedItemId)
      const position = () => {
        const triggerRect = trigger.getBoundingClientRect()
        panel.style.position = 'fixed'
        panel.style.left = `${triggerRect.left}px`
        panel.style.top = item === null
          ? `${triggerRect.top}px`
          : `${triggerRect.top - (item.getBoundingClientRect().top - panel.getBoundingClientRect().top)}px`
        panel.style.minWidth = `${triggerRect.width}px`
      }
      position()
      let observer: ResizeObserver | undefined
      try {
        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(position)
          observer.observe(trigger)
          observer.observe(panel)
          if (item !== null) observer.observe(item)
        }
      } catch {
        observer?.disconnect()
        observer = undefined
      }
      yield* Effect.acquireRelease(Effect.succeed(observer), current => Effect.sync(() => current?.disconnect()))
      return yield* Effect.never
    })),
  }
}
