import { Effect, Fiber, Option, Stream } from 'effect'
import type { MountAction } from '@wsagency/wseffect-foldkit/mount'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { describe, expect, it, vi } from 'vitest'
import * as Menu from './index.js'
import { createContextMenu, type ContextMenuConfig } from './context.js'

const bundle = createContextMenu<'edit' | 'delete'>()
const config: ContextMenuConfig<'edit' | 'delete'> = {
  id: 'actions',
  sourceId: 'source',
  sourceToken: 'source-token',
  items: [
    { value: 'edit', textValue: 'Edit', isDisabled: true, content: null },
    { value: 'delete', textValue: 'Delete', isDisabled: false, content: null },
  ],
}
type ContextSourceMount = MountAction<Menu.Message>
const captureSourceMount = (model: Menu.Model): ContextSourceMount => {
  const mounts: Array<MountAction<Menu.Message>> = []
  const h = new Proxy({}, {
    get: (_target, key) => (...args: ReadonlyArray<unknown>) => {
      if (key === 'OnMount') mounts.push(args[0] as MountAction<Menu.Message>)
      return null
    },
  }) as HtmlBuilder<Menu.Message>
  bundle.view(model, config, h)
  const mount = mounts.find(candidate => candidate.name === 'ContextMenuSourceEvents')
  if (mount === undefined) throw new Error('ContextMenuSourceEvents mount is required')
  return mount
}

const withSourceMount = async (body: (source: HTMLButtonElement, action: ContextSourceMount) => Promise<void>) => {
  const source = document.createElement('button')
  const action = captureSourceMount(bundle.init(config))
  let resolveReady!: () => void
  const ready = new Promise<void>(resolve => { resolveReady = resolve })
  const addEventListener = source.addEventListener.bind(source)
  source.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) => {
    if (listener !== null) addEventListener(type, listener, options)
    if (type === 'pointercancel') resolveReady()
  }) as typeof source.addEventListener
  const fiber = Effect.runFork(Stream.runDrain(action.f(source, Stream.never)))
  try {
    await ready
    await body(source, action)
  } finally {
    await Effect.runPromise(Fiber.interrupt(fiber))
  }
}

describe('Menu ContextMenu source', () => {
  it('maps pointer, touch, movement, and release events into messages', async () => {
    const source = document.createElement('button')
    const action = captureSourceMount(bundle.init(config))
    let resolveReady!: () => void
    const ready = new Promise<void>(resolve => { resolveReady = resolve })
    const addEventListener = source.addEventListener.bind(source)
    source.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) => {
      if (listener !== null) addEventListener(type, listener, options)
      if (type === 'pointercancel') resolveReady()
    }) as typeof source.addEventListener
    const collect = Effect.runPromise(Stream.runCollect(Stream.take(action.f(source, Stream.never), 4)))
    await ready
    source.dispatchEvent(new MouseEvent('contextmenu', { clientX: 20, clientY: 30 }))
    source.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerType: 'touch', clientX: 10, clientY: 20 }))
    source.dispatchEvent(new MouseEvent('contextmenu', { clientX: 10, clientY: 20, cancelable: true }))
    source.dispatchEvent(Object.assign(new Event('pointermove'), { pointerType: 'touch', clientX: 40, clientY: 60 }))
    source.dispatchEvent(new Event('pointerup'))
    expect(await collect).toEqual([
      Menu.Message.OpenedAt({ invocation: { sourceId: 'source', sourceToken: 'source-token', invocation: 'pointer', point: { x: 20, y: 30 } } }),
      Menu.Message.OpenedAt({ invocation: { sourceId: 'source', sourceToken: 'source-token', invocation: 'touch', point: { x: 10, y: 20 } } }),
      Menu.Message.MovedPointerOverItem({ index: -1, screenX: 40, screenY: 60 }),
      Menu.Message.IgnoredMouseClick(),
    ])
  })

  it('does not prevent native touch contextmenu before 600 ms but does after activation', async () => {
    await withSourceMount(async source => {
      vi.useFakeTimers()
      try {
        source.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerType: 'touch', clientX: 10, clientY: 20 }))
        const beforeActivation = new Event('contextmenu', { cancelable: true })
        source.dispatchEvent(beforeActivation)
        expect(beforeActivation.defaultPrevented).toBe(false)

        source.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerType: 'touch', clientX: 10, clientY: 20 }))
        await vi.advanceTimersByTimeAsync(600)
        const afterActivation = new Event('contextmenu', { cancelable: true })
        source.dispatchEvent(afterActivation)
        expect(afterActivation.defaultPrevented).toBe(true)
      } finally {
        vi.useRealTimers()
      }
    })
  })

  it('cancels long press after movement beyond 8px, release, or pointercancel', async () => {
    await withSourceMount(async source => {
      vi.useFakeTimers()
      try {
        source.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerType: 'touch', clientX: 10, clientY: 20 }))
        source.dispatchEvent(Object.assign(new Event('pointermove'), { pointerType: 'touch', clientX: 19, clientY: 20 }))
        await vi.advanceTimersByTimeAsync(600)
        const afterMove = new Event('contextmenu', { cancelable: true })
        source.dispatchEvent(afterMove)
        expect(afterMove.defaultPrevented).toBe(false)

        source.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerType: 'touch', clientX: 10, clientY: 20 }))
        source.dispatchEvent(new Event('pointerup'))
        await vi.advanceTimersByTimeAsync(600)
        const afterRelease = new Event('contextmenu', { cancelable: true })
        source.dispatchEvent(afterRelease)
        expect(afterRelease.defaultPrevented).toBe(false)

        source.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerType: 'touch', clientX: 10, clientY: 20 }))
        source.dispatchEvent(new Event('pointercancel'))
        await vi.advanceTimersByTimeAsync(600)
        const afterCancel = new Event('contextmenu', { cancelable: true })
        source.dispatchEvent(afterCancel)
        expect(afterCancel.defaultPrevented).toBe(false)
      } finally {
        vi.useRealTimers()
      }
    })
  })
  it('removes every source event listener when the mount is interrupted', async () => {
    const source = document.createElement('button')
    const action = captureSourceMount(bundle.init(config))
    const added: string[] = []
    const removed: string[] = []
    const addEventListener = source.addEventListener.bind(source)
    const removeEventListener = source.removeEventListener.bind(source)
    source.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) => {
      added.push(type)
      if (listener !== null) addEventListener(type, listener, options)
    }) as typeof source.addEventListener
    source.removeEventListener = ((type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) => {
      removed.push(type)
      if (listener !== null) removeEventListener(type, listener, options)
    }) as typeof source.removeEventListener
    const fiber = Effect.runFork(Stream.runDrain(action.f(source, Stream.never)))
    await vi.waitFor(() => expect(added).toEqual(['contextmenu', 'pointerdown', 'pointermove', 'pointerup', 'pointercancel']))
    await Effect.runPromise(Fiber.interrupt(fiber))
    expect(removed).toEqual(added)
  })
  it('ignores stale source-unmount tokens and closes only for the active source', () => {
    const opened = Menu.update(bundle.init(config), Menu.Message.OpenedAt({
      invocation: { invocation: 'keyboard', sourceId: 'source', sourceToken: 'source-token' },
    }))
    const staleUnmount = Menu.update(opened.model, Menu.Message.SourceUnmounted({ token: 'replacement-token' }))
    expect(staleUnmount.model.isOpen).toBe(true)
    expect(staleUnmount.model.maybeContextInvocation).toEqual(opened.model.maybeContextInvocation)

    const sourceUnmount = Menu.update(opened.model, Menu.Message.SourceUnmounted({ token: 'source-token' }))
    expect(sourceUnmount.model.isOpen).toBe(false)
    expect(sourceUnmount.model.maybeContextInvocation).toEqual(Option.none())
  })
  it('programmatically selects a value through the typed ContextMenu bundle', () => {
    const result = bundle.selectItem(bundle.init(config), 'delete', 1)
    expect(result.model.isOpen).toBe(false)
    expect(result.outMessage).toEqual({
      _tag: 'Selected',
      value: 'delete',
      index: 1,
    })
  })
})
