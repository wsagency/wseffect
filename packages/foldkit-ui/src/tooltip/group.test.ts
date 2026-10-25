import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import * as Group from './group.js'

const start = Group.init()

describe('Tooltip group', () => {
  it('uses the long first-open delay before any tooltip opens', () => {
    expect(Group.reflectShowDelay(start)).toBe(700)
  })

  it('starts a versioned skip window when a tooltip opens', async () => {
    const opened = Group.update(start, Group.Message.TooltipOpened({ now: 10 }))
    expect(Group.reflectShowDelay(opened.model)).toBe(0)
    const expiry = opened.commands?.[0]
    expect(expiry).toBeDefined()
    if (expiry === undefined) throw new Error('Expected a skip-window expiry command')
    expect(await Effect.runPromise(expiry.effect)).toEqual(
      Group.Message.SkipExpired({ version: opened.model.expiryVersion }),
    )
  })

  it('ignores an older expiry after a newer tooltip event', () => {
    const first = Group.update(start, Group.Message.TooltipOpened({ now: 10 }))
    const second = Group.update(first.model, Group.Message.TooltipClosed({ now: 20 }))
    const stale = Group.update(second.model, Group.Message.SkipExpired({ version: first.model.expiryVersion }))
    expect(stale.model.isSkipping).toBe(true)
  })

  it("expires only its own group's skip window", () => {
    const a = Group.update(Group.init(), Group.Message.TooltipOpened({ now: 10 }))
    const b = Group.init()
    expect(Group.reflectShowDelay(a.model)).toBe(0)
    expect(Group.reflectShowDelay(b)).toBe(700)
  })
})
