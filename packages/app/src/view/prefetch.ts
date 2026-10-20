import { Effect, Queue, Schema, Stream } from 'effect'
import { Mount } from 'foldkit'
import type { Attribute, HtmlBuilder } from 'foldkit/html'
import type { AnyPage } from '../contract.js'
import type { KitBinding } from '../kit/binding.js'


const USER_INPUT_COOLDOWN_MS = 300
const IDLE_DEADLINE_MIN_MS = 5

type IdleDeadline = Readonly<{
  timeRemaining: () => number
  didTimeout: boolean
}>

type IdleCallbackHost = {
  readonly requestIdleCallback?: (callback: (deadline: IdleDeadline) => void) => number
  readonly cancelIdleCallback?: (handle: number) => void
}

type PrefetchActivity = {
  lastUserInputAt: number
  routeLoadInFlight: boolean
  inputMounts: number
  inputTarget?: Document
  inputHandler?: EventListener
  readonly routeIdleWaiters: Set<() => void>
}

const prefetchActivities = new WeakMap<object, PrefetchActivity>()

function activityFor(messages: object): PrefetchActivity {
  let activity = prefetchActivities.get(messages)
  if (activity === undefined) {
    activity = {
      lastUserInputAt: Number.NEGATIVE_INFINITY,
      routeLoadInFlight: false,
      inputMounts: 0,
      routeIdleWaiters: new Set(),
    }
    prefetchActivities.set(messages, activity)
  }
  return activity
}

function attachInputTracking(activity: PrefetchActivity): () => void {
  if (activity.inputMounts === 0 && typeof document !== 'undefined') {
    const recordUserInput = () => { activity.lastUserInputAt = Date.now() }
    activity.inputTarget = document
    activity.inputHandler = recordUserInput
    document.addEventListener('pointerdown', recordUserInput, { capture: true, passive: true })
    document.addEventListener('keydown', recordUserInput, { capture: true })
  }
  activity.inputMounts += 1
  return () => {
    activity.inputMounts -= 1
    if (activity.inputMounts === 0 && activity.inputTarget !== undefined && activity.inputHandler !== undefined) {
      activity.inputTarget.removeEventListener('pointerdown', activity.inputHandler, true)
      activity.inputTarget.removeEventListener('keydown', activity.inputHandler, true)
      activity.inputTarget = undefined
      activity.inputHandler = undefined
    }
  }
}

export function isUserInputCooldownActive(messages: object): boolean {
  return Date.now() - activityFor(messages).lastUserInputAt < USER_INPUT_COOLDOWN_MS
}

export function setRouteLoadInFlight(messages: object, isLoading: boolean): void {
  const activity = activityFor(messages)
  if (activity.routeLoadInFlight === isLoading) return
  activity.routeLoadInFlight = isLoading
  if (!isLoading) {
    const waiters = [...activity.routeIdleWaiters]
    activity.routeIdleWaiters.clear()
    for (const resume of waiters) resume()
  }
}

function scheduleAfterIdle(callback: (deadline: IdleDeadline) => void): () => void {
  const host = globalThis as IdleCallbackHost
  if (host.requestIdleCallback !== undefined) {
    const handle = host.requestIdleCallback(callback)
    return () => host.cancelIdleCallback?.(handle)
  }
  const handle = setTimeout(() => callback({ timeRemaining: () => 50, didTimeout: false }), 0)
  return () => clearTimeout(handle)
}

const visiblePrefetchMounts = new WeakMap<object, Mount.MountDefinition>()

function getVisiblePrefetchMount<Pages extends Record<string, AnyPage>, KitMessage extends object>(
  binding: Pick<KitBinding<Pages, KitMessage>, 'messages'>,
) {
  const cached = visiblePrefetchMounts.get(binding.messages)
  if (cached) return cached as Mount.MountDefinition<'PrefetchOnVisible', KitMessage>
  const activity = activityFor(binding.messages)

  const observeVisible = Mount.defineStream('PrefetchOnVisible', {
    args: { key: Schema.String },
    messages: [binding.messages.requestedPrefetchSchema],
    execute: ({ element, key: pageKey }) => typeof IntersectionObserver === 'undefined'
      ? Stream.empty
      : Stream.callback<KitMessage>((queue) => Effect.gen(function*() {
        let cancelIdle: (() => void) | undefined
        let cancelCooldown: (() => void) | undefined
        let removeRouteIdleWaiter: (() => void) | undefined
        let active = true
        let hasIntersected = false
        let detachInputTracking: (() => void) | undefined
        const requestWhenIdle = () => {
          if (!active) return
          const cooldownRemaining = USER_INPUT_COOLDOWN_MS - (Date.now() - activity.lastUserInputAt)
          if (cooldownRemaining > 0) {
            const handle = setTimeout(() => {
              cancelCooldown = undefined
              requestWhenIdle()
            }, cooldownRemaining)
            cancelCooldown = () => clearTimeout(handle)
            return
          }
          if (activity.routeLoadInFlight) {
            const resume = () => {
              removeRouteIdleWaiter = undefined
              requestWhenIdle()
            }
            activity.routeIdleWaiters.add(resume)
            removeRouteIdleWaiter = () => activity.routeIdleWaiters.delete(resume)
            return
          }
          removeRouteIdleWaiter?.()
          removeRouteIdleWaiter = undefined
          cancelIdle = scheduleAfterIdle((deadline) => {
            cancelIdle = undefined
            if (!active) return
            if (
              deadline.timeRemaining() < IDLE_DEADLINE_MIN_MS
              || activity.routeLoadInFlight
              || isUserInputCooldownActive(binding.messages)
            ) {
              requestWhenIdle()
              return
            }
            Queue.offerUnsafe(queue, binding.messages.requestedPrefetch(pageKey, 'visible'))
          })
        }
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            detachInputTracking = attachInputTracking(activity)
            const observer = new IntersectionObserver((entries) => {
              if (!hasIntersected && entries.some((entry) => entry.isIntersecting)) {
                hasIntersected = true
                observer.disconnect()
                requestWhenIdle()
              }
            })
            observer.observe(element)
            return observer
          }),
          (observer) => Effect.sync(() => {
            active = false
            observer.disconnect()
            cancelIdle?.()
            cancelCooldown?.()
            removeRouteIdleWaiter?.()
            detachInputTracking?.()
            cancelIdle = undefined
            cancelCooldown = undefined
            removeRouteIdleWaiter = undefined
            detachInputTracking = undefined
          }),
        )
        return yield* Effect.never
      })),
  })
  visiblePrefetchMounts.set(binding.messages, observeVisible)
  return observeVisible
}

export function prefetchOnIntent<Pages extends Record<string, AnyPage>, KitMessage extends object>(
  binding: Pick<KitBinding<Pages, KitMessage>, 'messages'>,
  key: keyof Pages & string,
  h: HtmlBuilder<KitMessage>,
): ReadonlyArray<Attribute<KitMessage>> {
  const message = binding.messages.requestedPrefetch(key, 'intent')
  return [
    h.OnMouseEnter(message),
    h.OnFocus(message),
  ]
}

export function prefetchOnVisible<Pages extends Record<string, AnyPage>, KitMessage extends object>(
  binding: Pick<KitBinding<Pages, KitMessage>, 'messages'>,
  key: keyof Pages & string,
): Extract<Attribute<KitMessage>, { readonly _tag: 'OnMount' }> {
  return { _tag: 'OnMount', action: getVisiblePrefetchMount(binding)({ key }) }
}
