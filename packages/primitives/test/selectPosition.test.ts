import { Effect, Stream } from 'effect'
import type * as Mount from 'foldkit/mount'
import { expect, it, vi } from 'vitest'
import * as SelectPosition from '../src/select-position.js'

const rect = (top: number, width: number, height: number) => ({
  x: 10,
  y: top,
  top,
  left: 10,
  right: 10 + width,
  bottom: top + height,
  width,
  height,
  toJSON: () => ({}),
})

it('positions at the selected item and releases its observer', async () => {
  let disconnected = 0
  let observed!: () => void
  const observerReady = new Promise<void>(resolve => { observed = resolve })
  class Observer {
    constructor(_callback: ResizeObserverCallback) {}
    observe(): void { observed() }
    disconnect(): void { disconnected += 1 }
  }
  vi.stubGlobal('ResizeObserver', Observer)
  const trigger = document.createElement('button')
  trigger.id = 'trigger'
  const panel = document.createElement('div')
  panel.id = 'panel'
  const selected = document.createElement('div')
  selected.id = 'selected'
  panel.append(selected)
  document.body.append(trigger, panel)
  vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(rect(100, 80, 30))
  vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue(rect(20, 80, 180))
  vi.spyOn(selected, 'getBoundingClientRect').mockReturnValue(rect(70, 80, 20))

  const action: Mount.MountAction<never> = SelectPosition.mountSelectPosition({
    panelId: 'panel',
    triggerId: 'trigger',
    selectedItemId: 'selected',
  })
  const result = await Effect.runPromise(Effect.race(
    Stream.runHead(action.f(panel, Stream.empty)).pipe(Effect.as('message')),
    Effect.promise(() => observerReady).pipe(Effect.as('observed')),
  ))
  expect(result).toBe('observed')
  expect(panel.style.top).toBe('50px')
  expect(panel.style.left).toBe('10px')
  expect(panel.style.minWidth).toBe('80px')
  expect(disconnected).toBe(1)
  trigger.remove()
  panel.remove()
  vi.unstubAllGlobals()
})

it('falls back to trigger-anchored placement when the selected item is missing', async () => {
  let disconnected = 0
  let observed!: () => void
  const observerReady = new Promise<void>(resolve => { observed = resolve })
  class Observer {
    constructor(_callback: ResizeObserverCallback) {}
    observe(): void { observed() }
    disconnect(): void { disconnected += 1 }
  }
  vi.stubGlobal('ResizeObserver', Observer)
  const trigger = document.createElement('button')
  trigger.id = 'trigger'
  const panel = document.createElement('div')
  panel.id = 'panel'
  document.body.append(trigger, panel)
  vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(rect(100, 80, 30))

  const action: Mount.MountAction<never> = SelectPosition.mountSelectPosition({
    panelId: 'panel',
    triggerId: 'trigger',
    selectedItemId: 'missing',
  })
  const result = await Effect.runPromise(Effect.race(
    Stream.runHead(action.f(panel, Stream.empty)).pipe(Effect.as('message')),
    Effect.promise(() => observerReady).pipe(Effect.as('observed')),
  ))
  expect(result).toBe('observed')
  expect(panel.style.top).toBe('100px')
  expect(panel.style.left).toBe('10px')
  expect(panel.style.minWidth).toBe('80px')
  expect(disconnected).toBe(1)
  trigger.remove()
  panel.remove()
  vi.unstubAllGlobals()
})
