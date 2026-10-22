import { Effect, Schema } from 'effect'
import * as Mount from 'foldkit/mount'
import * as UiHoverIntent from '@foldkit/ui/hoverIntent'
import * as UiAnchor from '@foldkit/ui/anchor'

export const AnchorHoverCard = Mount.define('AnchorHoverCard', {
  args: { buttonId: Schema.String, anchor: UiAnchor.AnchorConfig },
  messages: [UiHoverIntent.Message],
  execute: ({ element, buttonId, anchor }) => Effect.acquireRelease(
    Effect.sync(() => {
      const removePortal = UiAnchor.portalToContainingRoot(element)
      const stopPositioning = UiAnchor.anchorSetup(element, { buttonId, anchor, interceptTab: false })
      return () => {
        stopPositioning()
        removePortal()
      }
    }),
    cleanup => Effect.sync(cleanup),
  ).pipe(Effect.as(UiHoverIntent.Message.CompletedWaitBeforeClosing({ version: -1 }))),
})
