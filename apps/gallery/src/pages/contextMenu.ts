import { Option, Schema } from 'effect'
import { Submodel } from '@wsagency/wseffect-foldkit'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import * as ContextMenu from '@wsagency/wseffect-themes/components/context-menu'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, PageOutMessage, type PageInputs } from '../contract.js'

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
})

export const page = galleryPageContract.definePage({
  Model, Message,
  init: () => ({ model: {
    menu: Menu.init({
      id: 'Actions', sourceId: 'gallery-context-source', sourceToken: 'gallery-context-token', longPressMs: 600,
      items: [],
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
