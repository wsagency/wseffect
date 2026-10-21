import { Effect, Stream } from 'effect'
import type * as Mount from 'foldkit/mount'
import { expect, it, vi } from 'vitest'
import * as SelectPosition from '../src/select-position.js'

it('positions panel at selected item and cleans observer', async () => {
  let disconnected = 0
  class Observer {
    constructor(_callback: ResizeObserverCallback) {}
    observe(): void {}
    disconnect(): void { disconnected += 1 }
    unobserve(): void {}
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
  vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({ x: 10, y: 100, top: 100, left: 10, right: 90, bottom: 130, width: 80, height: 30, toJSON: () => ({}) })
  vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({ x: 10, y: 20, top: 20, left: 10, right: 90, bottom: 200, width: 80, height: 180, toJSON: () => ({}) })
  vi.spyOn(selected, 'getBoundingClientRect').mockReturnValue({ x: 10, y: 70, top: 70, left: 10, right: 90, bottom: 90, width: 80, height: 20, toJSON: () => ({}) })
  const action: Mount.MountAction<SelectPosition.SelectPositionMessage> = SelectPosition.mountSelectPosition({ panelId: 'panel', triggerId: 'trigger', selectedItemId: 'selected' })
  const events = action.f(panel, Stream.empty)
  const first = await Effect.runPromise(Stream.runHead(events))
  expect(first._tag).toBe('Some')
  expect(panel.style.top).toBe('50px')
  expect(disconnected).toBe(1)
  trigger.remove()
  panel.remove()
})
