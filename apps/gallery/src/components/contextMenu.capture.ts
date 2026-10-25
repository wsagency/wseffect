import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'
import * as ContextMenu from '@wsagency/wseffect-themes/components/context-menu'
import * as Button from '@wsagency/wseffect-themes/components/button'

const Menu = ContextMenu.create<'Open' | 'Rename' | 'Delete'>()
const createConfig = <ParentMessage>(h: HtmlBuilder<ParentMessage>) => ({
  id: 'Actions', sourceId: 'gallery-context-source', sourceToken: 'gallery-context-token', longPressMs: 600 as const,
  items: [
    { value: 'Open' as const, textValue: 'Open', isDisabled: false, content: h.span([], ['Open']) },
    { value: 'Rename' as const, textValue: 'Rename', isDisabled: false, content: h.span([], ['Rename']) },
    { value: 'Delete' as const, textValue: 'Delete', isDisabled: false, content: h.span([], ['Delete']) },
  ],
})

export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  renderCaptureView(root, request, (h) => h.div([], [
    Button.view({ variant: 'outline' }, ['Right-click for actions'], h),
    Menu.embed(h, {
      slotId: 'capture-context-menu',
      model: Menu.init({
        id: '',
        sourceId: 'capture-context-source',
        sourceToken: 'capture-context-token',
        longPressMs: 600,
        items: [],
      }),
      config: { ...createConfig(h), id: '', sourceId: 'capture-context-source', sourceToken: 'capture-context-token' },
      toParentMessage: () => ({ _tag: 'Noop' }),
    }),
  ]))
}
