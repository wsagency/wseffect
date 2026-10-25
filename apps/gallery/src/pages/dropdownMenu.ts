import { Option, Schema } from 'effect'
import { Submodel } from '@wsagency/wseffect-foldkit'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import * as DropdownMenu from '@wsagency/wseffect-themes/components/dropdown-menu'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, type PageInputs, PageOutMessage } from '../contract.js'

const Menu = DropdownMenu.create<'Edit' | 'Delete'>()
export const Model = Schema.Struct({
  menu: Menu.Model,
  selected: Schema.Option(Schema.String),
})
export const Message = defineMessageUnion({ MenuEvent: { message: Menu.Message } })
type Model = typeof Model.Type
type Message = typeof Message.Type

const foldMenu = Menu.fold<Model, Message, typeof PageOutMessage.Type>({
  read: model => Option.some(model.menu),
  write: (model, menu) => ({ ...model, menu }),
  toParentMessage: message => Message.MenuEvent({ message }),
  foldOutMessage: outMessage => model => ({
    model: { ...model, selected: Option.some(outMessage.value) },
  }),
})

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({ model: { menu: Menu.init({ id: 'gallery-actions' }), selected: Option.none() } }),
  update: (model: Model, message: Message) => Message.match(message, {
    MenuEvent: ({ message: menuMessage }) => foldMenu(model, menuMessage),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, inputs, h) => h.div([], [
    Heading.view({ as: 'h1' }, ['Dropdown menu'], h),
    h.div([h.DataAttribute('perf', 'dropdown-open'), h.Style({ display: 'contents' })], [
      Menu.embed(h, {
        slotId: 'gallery-actions',
        model: model.menu,
        toParentMessage: message => Message.MenuEvent({ message }),
        viewInputs: {
          items: ['Edit', 'Delete'],
          itemToConfig: item => ({ content: h.span([], [item]) }),
          buttonContent: h.span([], ['Actions']),
        },
      }),
    ]),
    h.p([h.Id('dropdown-selection')], [Option.match(model.selected, {
      onNone: () => 'No action selected',
      onSome: item => `Selected: ${item}`,
    })]),
  ])),
})
