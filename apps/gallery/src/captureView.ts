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
    view: (_model, h) => Theme.view({ settings, isRoot: true }, [view(h, request)], h),
    container: runtimeHost,
  }))
}
