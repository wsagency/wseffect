import { Schema } from 'effect'
import { makeElement, run } from '@wsagency/wseffect-foldkit/runtime'
import type { Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Theme from '@wsagency/wseffect-themes/components/theme'
import type { CaptureRequest } from './capture.js'

const CaptureModel = Schema.Struct({})
const CaptureMessageSchema = Schema.Struct({ _tag: Schema.String })
type CaptureMessage = typeof CaptureMessageSchema.Type
export type CaptureView = (h: HtmlBuilder<CaptureMessage>, request: CaptureRequest) => Html

const captureRenderPromises = new WeakMap<HTMLElement, Promise<void>>()

export const waitForCaptureView = (root: HTMLElement): Promise<void> =>
  captureRenderPromises.get(root) ?? Promise.resolve()

export function renderCaptureView(root: HTMLElement, request: CaptureRequest, view: CaptureView): Promise<void> {
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

  const rendered = new Promise<void>((resolve, reject) => {
    const observer = new MutationObserver(() => {
      if (root.querySelector('[data-is-root-theme="true"]')) {
        observer.disconnect()
        clearTimeout(timeout)
        resolve()
      }
    })
    const timeout = setTimeout(() => {
      observer.disconnect()
      reject(new Error('Capture runtime did not render its root Theme'))
    }, 5000)
    observer.observe(root, { childList: true, subtree: true })
  })
  captureRenderPromises.set(root, rendered)

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
  return rendered
}
