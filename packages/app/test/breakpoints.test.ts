import { Effect, Fiber, Stream } from 'effect'
import { describe, expect, it, vi } from 'vitest'
import { breakpointSubscription } from '../src/breakpoints.js'

describe('breakpoint Subscription', () => {
  it('emits the initial breakpoint and checks every threshold below, at, and above', async () => {
    let width = 0
    const listeners = new Map<number, Set<(event: MediaQueryListEvent) => void>>()
    const original = Object.getOwnPropertyDescriptor(window, 'matchMedia')
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: (query: string) => {
      const minWidth = Number(query.match(/\d+/)?.[0] ?? 0)
      const handlers = listeners.get(minWidth) ?? new Set<(event: MediaQueryListEvent) => void>()
      listeners.set(minWidth, handlers)
      return {
        media: query,
        get matches() { return width >= minWidth },
        addEventListener: (_name: string, handler: (event: MediaQueryListEvent) => void) => { handlers.add(handler) },
        removeEventListener: (_name: string, handler: (event: MediaQueryListEvent) => void) => { handlers.delete(handler) },
      } as MediaQueryList
    } })
    const values: string[] = []
    let fiber: Fiber.Fiber<void, never> | undefined
    try {
      const subscription = breakpointSubscription((value) => value)
      const entry = Object.values(subscription)[0]!
      fiber = Effect.runFork(Stream.runForEach(entry.dependenciesToStream({}), (value) => Effect.sync(() => { values.push(value) })))
      await vi.waitFor(() => expect(values).toEqual(['initial']))
      const thresholds = [
        ['xs', 520],
        ['sm', 768],
        ['md', 1024],
        ['lg', 1280],
        ['xl', 1640],
      ] as const
      const expected: string[] = ['initial']
      for (const [name, threshold] of thresholds) {
        for (const nextWidth of [threshold - 1, threshold, threshold + 1]) {
          width = nextWidth
          const callback = listeners.values().next().value?.values().next().value
          callback?.(new Event('change') as MediaQueryListEvent)
          expected.push(nextWidth >= threshold ? name : thresholds.filter(([, minWidth]) => nextWidth >= minWidth).at(-1)?.[0] ?? 'initial')
          await vi.waitFor(() => expect(values.length).toBe(expected.length))
        }
      }
      expect(values).toEqual(expected)
      expect([...listeners.values()].every((handlers) => handlers.size === 1)).toBe(true)
    } finally {
      if (fiber !== undefined) await Effect.runPromise(Fiber.interrupt(fiber))
      expect([...listeners.values()].every((handlers) => handlers.size === 0)).toBe(true)
      if (original === undefined) Reflect.deleteProperty(window, 'matchMedia')
      else Object.defineProperty(window, 'matchMedia', original)
    }
  })
})
