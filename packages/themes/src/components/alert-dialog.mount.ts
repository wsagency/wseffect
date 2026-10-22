import { Effect } from 'effect'
import * as Mount from 'foldkit/mount'
import * as UiAnchor from '@foldkit/ui/anchor'
import * as UiDialog from '@foldkit/ui/dialog'

export const PortalAlertDialog = Mount.define('PortalAlertDialog', {
  messages: [UiDialog.Message.CompletedCloseDialog],
  execute: ({ element }) => Effect.acquireRelease(
    Effect.sync(() => UiAnchor.portalToContainingRoot(element)),
    cleanup => Effect.sync(cleanup),
  ).pipe(Effect.as(UiDialog.Message.CompletedCloseDialog())),
})
