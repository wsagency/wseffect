import { Effect } from 'effect'
import * as Mount from '@wsagency/wseffect-foldkit/mount'
import * as UiAnchor from '@wsagency/wseffect-foldkit-ui/anchor'
import * as UiDialog from '@wsagency/wseffect-foldkit-ui/dialog'

export const PortalAlertDialog = Mount.define('PortalAlertDialog', {
  messages: [UiDialog.Message.CompletedCloseDialog],
  execute: ({ element }) => Effect.acquireRelease(
    Effect.sync(() => UiAnchor.portalToContainingRoot(element)),
    cleanup => Effect.sync(cleanup),
  ).pipe(Effect.as(UiDialog.Message.CompletedCloseDialog())),
})
