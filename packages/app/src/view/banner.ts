import { Submodel } from '@wsagency/wseffect-foldkit'
import type { AnyPage } from '../contract.js'
import type { KitState } from '../kit/state.js'

export function bannerView<Pages extends Record<string, AnyPage>, KitMessage extends object>(
  clickedApplyUpdate: () => KitMessage,
): Submodel.View<KitState<Pages>, KitMessage> {
  return Submodel.defineView<KitState<Pages>, KitMessage>((state, h) => {
    if (!state.pwa.isUpdateAvailable) return null
    return h.div([h.Id('wseffect-update'), h.Role('status')], [
      h.p([], ['An update is available.']),
      h.button([h.Id('wseffect-update-reload'), h.OnClick(clickedApplyUpdate())], ['Reload']),
    ])
  })
}
