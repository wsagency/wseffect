import { Effect, Queue, Schema, Stream } from 'effect'
import { Mount } from 'foldkit'
import type { Attribute, HtmlBuilder } from 'foldkit/html'
import type { AnyPage } from '../contract.js'
import type { KitBinding } from '../kit/binding.js'

export function prefetchOnIntent<Pages extends Record<string, AnyPage>, KitMessage extends object>(
  binding: Pick<KitBinding<Pages, KitMessage>, 'messages'>,
  key: keyof Pages & string,
  h: HtmlBuilder<KitMessage>,
): ReadonlyArray<Attribute<KitMessage>> {
  const message = binding.messages.requestedPrefetch(key)
  return [
    h.OnMouseEnter(message),
    h.OnFocus(message),
  ]
}

const visiblePrefetchMounts = new WeakMap<object, Mount.MountDefinition>()

function getVisiblePrefetchMount<Pages extends Record<string, AnyPage>, KitMessage extends object>(
  binding: Pick<KitBinding<Pages, KitMessage>, 'messages'>,
) {
  const cached = visiblePrefetchMounts.get(binding.messages)
  if (cached) return cached as Mount.MountDefinition<'PrefetchOnVisible', KitMessage>

  const observeVisible = Mount.defineStream('PrefetchOnVisible', {
    args: { key: Schema.String },
    messages: [binding.messages.requestedPrefetchSchema],
    execute: ({ element, key: pageKey }) => typeof IntersectionObserver === 'undefined'
      ? Stream.empty
      : Stream.callback<KitMessage>((queue) => Effect.gen(function*() {
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            const observer = new IntersectionObserver((entries) => {
              if (entries.some((entry) => entry.isIntersecting)) {
                observer.disconnect()
                Queue.offerUnsafe(queue, binding.messages.requestedPrefetch(pageKey))
              }
            })
            observer.observe(element)
            return observer
          }),
          (observer) => Effect.sync(() => observer.disconnect()),
        )
        return yield* Effect.never
      })),
  })
  visiblePrefetchMounts.set(binding.messages, observeVisible)
  return observeVisible
}

export function prefetchOnVisible<Pages extends Record<string, AnyPage>, KitMessage extends object>(
  binding: Pick<KitBinding<Pages, KitMessage>, 'messages'>,
  key: keyof Pages & string,
): Attribute<KitMessage> {
  return { _tag: 'OnMount', action: getVisiblePrefetchMount(binding)({ key }) }
}
