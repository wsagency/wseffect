import * as ThemePanel from '@wsagency/wseffect-themes/components/theme-panel'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'

export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  const settings = { accentColor: 'indigo', grayColor: 'gray', radius: 'medium', scaling: '100%', appearance: request.theme, panelBackground: 'translucent', hasBackground: true } as const
  renderCaptureView(root, request, h => ThemePanel.view({ isOpen: false, settings, toSettingsChanged: settings => ({ _tag: 'SettingsChanged', settings }) as never }, [], h))
}
