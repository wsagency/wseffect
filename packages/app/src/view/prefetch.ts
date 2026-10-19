import { Effect, Queue, Schema, Stream } from 'effect'
import { Mount } from 'foldkit'
import type { Attribute } from 'foldkit/html'
import type { AnyPage } from '../contract.js'
import type { KitBinding } from '../kit/binding.js'

export function prefetchOnIntent<Pages extends Record<string, AnyPage>, KitMessage extends object>(
  binding: Pick<KitBinding<Pages, KitMessage>, 'messages'>,
  key: keyof Pages & string,
): ReadonlyArray<Attribute<KitMessage>> {
  const message = binding.messages.requestedPrefetch(key)
  return [
    { _tag: 'OnMouseEnter', message },
    { _tag: 'OnFocus', message },
  ]
}

export function prefetchOnVisible<Pages extends Record<string, AnyPage>, KitMessage extends object>(
  binding: Pick<KitBinding<Pages, KitMessage>, 'messages'>,
  key: keyof Pages & string,
): Attribute<KitMessage> {
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
  return { _tag: 'OnMount', action: observeVisible({ key }) }
}
