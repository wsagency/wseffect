import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Stream from 'effect/Stream'
import * as HoverIntent from '@wsagency/wseffect-foldkit-ui/hoverIntent'
import type * as Anchor from '@wsagency/wseffect-foldkit-ui/anchor'
import * as Mount from '@wsagency/wseffect-foldkit/mount'
import { describe, expect, it, vi } from 'vitest'
import { AnchorHoverCard } from '../src/components/hover-card-anchor.js'

const { anchorSetup, portalToContainingRoot, removePortal, stopPositioning } = vi.hoisted(() => ({
  removePortal: vi.fn(),
  stopPositioning: vi.fn(),
  anchorSetup: vi.fn(() => stopPositioning),
  portalToContainingRoot: vi.fn(() => removePortal),
}))
vi.mock('@wsagency/wseffect-foldkit-ui/anchor', async importOriginal => {
  const actual = await importOriginal<typeof Anchor>()
  return { ...actual, anchorSetup, portalToContainingRoot }
})

describe('HoverCard mount', () => {
  it('sets up portal positioning and releases both resources after emitting completion', async () => {
    const element = {} as Element
    const action = AnchorHoverCard({ buttonId: 'person-trigger', anchor: { portal: true } })
    const result = await Effect.runPromise(Effect.scoped(Stream.runHead(action.f(element, Mount.liveViewStateChanges))))

    expect(result).toEqual(Option.some(HoverIntent.Message.CompletedWaitBeforeClosing({ version: -1 })))
    expect(portalToContainingRoot).toHaveBeenCalledOnce()
    expect(portalToContainingRoot).toHaveBeenCalledWith(element)
    expect(anchorSetup).toHaveBeenCalledOnce()
    expect(anchorSetup).toHaveBeenCalledWith(element, { buttonId: 'person-trigger', anchor: { portal: true }, interceptTab: false })
    expect(stopPositioning).toHaveBeenCalledOnce()
    expect(removePortal).toHaveBeenCalledOnce()
  })
})
