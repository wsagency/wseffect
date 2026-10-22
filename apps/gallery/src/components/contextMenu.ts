import '@wsagency/wseffect-themes/css/context-menu.css'
import { Option, Schema } from 'effect'
import { Submodel } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as ContextMenu from '@wsagency/wseffect-themes/components/context-menu'
import * as Button from '@wsagency/wseffect-themes/components/button'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, PageOutMessage, type PageInputs } from '../contract.js'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'

const Menu = ContextMenu.create<'Open' | 'Rename' | 'Delete'>()
export const Model = Schema.Struct({ menu: Menu.Model, selected: Schema.Option(Schema.String) })
export const Message = defineMessageUnion({ MenuEvent: { message: Menu.Message } })
type Model = typeof Model.Type
type Message = typeof Message.Type
const foldMenu = Menu.fold<Model, Message, typeof PageOutMessage.Type>({
  read: model => Option.some(model.menu),
  write: (model, menu) => ({ ...model, menu }),
  toParentMessage: message => Message.MenuEvent({ message }),
  foldOutMessage: outMessage => model => ({ model: { ...model, selected: Option.some(outMessage.value) } }),
})
const createConfig = <ParentMessage>(h: HtmlBuilder<ParentMessage>) => ({
  id: 'Actions', sourceId: 'gallery-context-source', sourceToken: 'gallery-context-token', longPressMs: 600 as const,
  items: [
    { value: 'Open' as const, textValue: 'Open', isDisabled: false, content: h.span([], ['Open']) },
    { value: 'Rename' as const, textValue: 'Rename', isDisabled: false, content: h.span([], ['Rename']) },
    { value: 'Delete' as const, textValue: 'Delete', isDisabled: false, content: h.span([], ['Delete']) },
  ],
  toItem: (item: 'Open' | 'Rename' | 'Delete') => h.span([], [item]),
})

export const page = galleryPageContract.definePage({
  Model, Message,
  init: () => ({ model: {
    menu: Menu.init({
      id: 'Actions', sourceId: 'gallery-context-source', sourceToken: 'gallery-context-token', longPressMs: 600,
      items: [], toItem: () => null,
    }),
    selected: Option.none(),
  } }),
  update: (model: Model, message: Message) => Message.match(message, {
    MenuEvent: ({ message: child }) => foldMenu(model, child),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => h.div([], [
    Heading.view({ as: 'h1' }, ['Context menu'], h),
    Menu.embed(h, { slotId: 'gallery-context-menu', model: model.menu, config: createConfig(h), toParentMessage: message => Message.MenuEvent({ message }) }),
    h.p([], ['Right-click for actions']),
    h.p([], [Option.match(model.selected, { onNone: () => 'No action selected', onSome: value => `Selected: ${value}` })]),
  ])),
})

export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  renderCaptureView(root, request, (h) => h.div([], [
    Button.view({ variant: 'outline' }, ['Right-click for actions'], h),
    Menu.embed(h, {
      slotId: 'capture-context-menu',
      model: Menu.init({ id: '', sourceId: 'capture-context-source', sourceToken: 'capture-context-token', longPressMs: 600, items: [], toItem: () => null }),
      config: { ...createConfig(h), id: '', sourceId: 'capture-context-source', sourceToken: 'capture-context-token' },
      toParentMessage: () => ({ _tag: 'Noop' }),
    }),
  ]))
}
