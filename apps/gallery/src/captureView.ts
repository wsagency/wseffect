import { Schema } from 'effect'
import { makeElement, run } from 'foldkit/runtime'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Theme from '@wsagency/wseffect-themes/components/theme'
import type { CaptureRequest } from './capture.js'

const CaptureModel = Schema.Struct({})
const CaptureMessageSchema = Schema.Struct({ _tag: Schema.String })
type CaptureMessage = typeof CaptureMessageSchema.Type
export type CaptureView = (h: HtmlBuilder<CaptureMessage>, request: CaptureRequest) => Html

export function renderCaptureView(root: HTMLElement, request: CaptureRequest, view: CaptureView): void {
  root.classList.add('sp2-capture')
  root.dataset.sp2CaptureFamily = request.family
  const settings = {
    accentColor: 'indigo',
    grayColor: 'gray',
    radius: 'medium',
    scaling: '100%',
    appearance: request.theme,
    panelBackground: 'translucent',
    hasBackground: true,
  } as const
  const runtimeHost = document.createElement('div')
  runtimeHost.id = 'sp2-capture-runtime'
  root.append(runtimeHost)
  run(makeElement({
    Model: CaptureModel,
    init: () => ({ model: {} }),
    update: (model) => ({ model }),
    view: (_model, h) => Theme.view({ settings, isRoot: true }, [
      h.div([
        h.DataAttribute('sp2-capture-target', ''),
        h.Style({ width: '480px', minHeight: '160px', padding: '24px', background: 'var(--gray-2, #f6f7f9)', boxSizing: 'border-box' }),
      ], [view(h, request)]),
    ], h),
    container: runtimeHost,
  }))
}
