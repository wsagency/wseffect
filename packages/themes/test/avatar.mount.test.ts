import { Effect, Fiber, Stream } from 'effect'
import { describe, expect, it, vi } from 'vitest'
import { mountAvatarImage } from '../src/components/avatar.mount.js'

const markup = '<img class="rt-AvatarImage"><span class="rt-AvatarFallback"></span><span class="rt-AvatarFallback rt-two-letters" hidden>AB</span>'

describe('Avatar image fallback mount', () => {
  it('switches to fallback on image error and releases its listener', async () => {
    const root = document.createElement('span')
    root.innerHTML = markup
    const image = root.querySelector<HTMLImageElement>('.rt-AvatarImage')!
    const fallbacks = root.querySelectorAll<HTMLElement>('.rt-AvatarFallback')
    const loadingFallback = fallbacks[0]!
    const fallback = fallbacks[1]!
    const addListener = vi.spyOn(image, 'addEventListener')
    const fiber = Effect.runFork(Stream.runDrain(mountAvatarImage<never>().f(image, Stream.empty)))
    await vi.waitFor(() => expect(addListener).toHaveBeenCalledWith('error', expect.any(Function)))
    image.dispatchEvent(new Event('error'))
    expect(root.dataset.state).toBe('error')
    expect(image.hidden).toBe(true)
    expect(loadingFallback.hidden).toBe(true)
    expect(fallback.hidden).toBe(false)
    await Effect.runPromise(Fiber.interrupt(fiber))
    image.hidden = false
    fallback.hidden = true
    image.dispatchEvent(new Event('error'))
    expect(image.hidden).toBe(false)
    expect(fallback.hidden).toBe(true)
  })

  it('switches to fallback for an already failed complete image', async () => {
    const root = document.createElement('span')
    root.innerHTML = markup
    const image = root.querySelector<HTMLImageElement>('.rt-AvatarImage')!
    const fallback = root.querySelectorAll<HTMLElement>('.rt-AvatarFallback')[1]!
    Object.defineProperties(image, { complete: { value: true }, naturalWidth: { value: 0 } })
    const fiber = Effect.runFork(Stream.runDrain(mountAvatarImage<never>().f(image, Stream.empty)))
    await vi.waitFor(() => expect(fallback.hidden).toBe(false))
    await Effect.runPromise(Fiber.interrupt(fiber))
  })

  it('hides the loading fallback once the image loads', async () => {
    const root = document.createElement('span')
    root.innerHTML = markup
    const image = root.querySelector<HTMLImageElement>('.rt-AvatarImage')!
    const loadingFallback = root.querySelectorAll<HTMLElement>('.rt-AvatarFallback')[0]!
    const addListener = vi.spyOn(image, 'addEventListener')
    const fiber = Effect.runFork(Stream.runDrain(mountAvatarImage<never>().f(image, Stream.empty)))
    await vi.waitFor(() => expect(addListener).toHaveBeenCalledWith('load', expect.any(Function)))
    image.dispatchEvent(new Event('load'))
    expect(loadingFallback.hidden).toBe(true)
    await Effect.runPromise(Fiber.interrupt(fiber))
  })
})
