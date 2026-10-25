import { Effect, Queue, Stream } from 'effect'
import { Subscription } from '@wsagency/wseffect-foldkit'
import { BREAKPOINTS } from '@wsagency/wseffect-themes/breakpoints'

export type Breakpoint = 'initial' | typeof BREAKPOINTS[number]['name']

function currentBreakpoint(breakpoints: typeof BREAKPOINTS): Breakpoint {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'initial'
  let current: Breakpoint = 'initial'
  for (const breakpoint of breakpoints) {
    if (window.matchMedia(`(min-width: ${breakpoint.minWidth}px)`).matches) current = breakpoint.name
  }
  return current
}

function breakpointStream<Message>(toMessage: (value: Breakpoint) => Message): Stream.Stream<Message> {
  return Stream.callback<Message>((queue) => Effect.gen(function*() {
    yield* Effect.acquireRelease(
      Effect.sync(() => {
        let lastEmitted: Breakpoint | undefined
        const emit = () => {
          const current = currentBreakpoint(BREAKPOINTS)
          if (current === lastEmitted) return
          lastEmitted = current
          Queue.offerUnsafe(queue, toMessage(current))
        }
        const queries = BREAKPOINTS.map(({ minWidth }) => window.matchMedia(`(min-width: ${minWidth}px)`))
        for (const query of queries) query.addEventListener('change', emit)
        emit()
        return () => { for (const query of queries) query.removeEventListener('change', emit) }
      }),
      (release) => Effect.sync(release),
    )
    return yield* Effect.never
  }))
}

export function breakpointSubscription<Message>(toMessage: (value: Breakpoint) => Message) {
  return Subscription.make<unknown, Message>()((entry) => ({
    'wseffect:breakpoint': entry({}, {
      modelToDependencies: () => ({}),
      dependenciesToStream: () => breakpointStream(toMessage),
    }),
  }))
}
