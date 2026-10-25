import { Effect, Stream } from 'effect'
import type { Mount } from '@wsagency/wseffect-foldkit'

export const mountAvatarImage = <Message>(): Mount.MountAction<Message> => ({
  name: 'AvatarImageFallback',
  f: element => Stream.callback<Message>(() => Effect.gen(function* () {
    const image = element as HTMLImageElement
    const root = image.parentElement
    if (root === null) return yield* Effect.never
    const fallbacks = root.querySelectorAll<HTMLElement>('.rt-AvatarFallback')
    const loadingFallback = fallbacks[0]
    const fallback = fallbacks[1]
    if (loadingFallback === undefined || fallback === undefined) return yield* Effect.never
    const onError = () => {
      image.hidden = true
      loadingFallback.hidden = true
      fallback.hidden = false
      root.dataset.state = 'error'
    }
    const onLoad = () => {
      loadingFallback.hidden = true
      root.dataset.state = 'loaded'
    }
    yield* Effect.acquireRelease(
      Effect.sync(() => {
        image.addEventListener('error', onError)
        image.addEventListener('load', onLoad)
        if (image.complete) {
          if (image.naturalWidth === 0) onError()
          else onLoad()
        }
        return () => {
          image.removeEventListener('error', onError)
          image.removeEventListener('load', onLoad)
        }
      }),
      cleanup => Effect.sync(cleanup),
    )
    return yield* Effect.never
  })),
})
