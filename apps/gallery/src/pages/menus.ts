import { Schema } from 'effect'
import { Command, Submodel } from 'foldkit'
import { createKeyedLazy, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as DropdownMenu from '@wsagency/wseffect-themes/components/dropdown-menu'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, type PageInputs } from '../contract.js'

export const Menu: DropdownMenu.Bundle<'Inspect' | 'Archive'> = DropdownMenu.create<'Inspect' | 'Archive'>()
const MenuState = Schema.Struct({ id: Schema.String, model: Menu.Model })
export const Model = Schema.Struct({ menus: Schema.Array(MenuState), ticks: Schema.Number })
export const Message = defineMessageUnion({
  MenuEvent: { index: Schema.Number, message: Menu.Message },
  Tick: {},
})
type Model = typeof Model.Type
type Message = typeof Message.Type
const keyedMenu = createKeyedLazy()

export const renderMenu = (
  model: typeof Menu.Model.Type,
  id: string,
  index: number,
  h: HtmlBuilder<Message>,
  accentColor: PageInputs['accentColor'],
  grayColor: PageInputs['grayColor'],
  radius: PageInputs['radius'],
  scaling: PageInputs['scaling'],
  appearance: PageInputs['appearance'],
  panelBackground: PageInputs['panelBackground'],
) => Menu.embed(h, {
  slotId: id,
  model,
  toParentMessage: (message) => Message.MenuEvent({ index, message }),
  viewInputs: {
    themeSettings: { accentColor, grayColor, radius, scaling, appearance, panelBackground, hasBackground: true },
    items: ['Inspect', 'Archive'],
    itemToConfig: (item) => ({ content: h.span([], [item]) }),
    buttonContent: h.span([h.DataAttribute('menu-index', String(index))], [`Menu ${index}`]),
  },
})

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({
    model: {
      menus: Array.from({ length: 200 }, (_, index) => {
        const id = `gallery-menu-${index}`
        return { id, model: Menu.init({ id }) }
      }),
      ticks: 0,
    },
  }),
  update: (model: Model, message: Message) => Message.match(message, {
    Tick: () => ({ model: { ...model, ticks: model.ticks + 1 } }),
    MenuEvent: ({ index, message: menuMessage }) => {
      const current = model.menus[index]
      if (current === undefined) return { model }
      const result = Menu.update(current.model, menuMessage)
      return {
        model: {
          ...model,
          menus: model.menus.map((menu, menuIndex) => menuIndex === index ? { ...menu, model: result.model } : menu),
        },
        commands: result.commands?.map((command) => Command.mapMessage(command, (childMessage) => Message.MenuEvent({ index, message: childMessage }))) ?? [],
      }
    },
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, inputs, h) => h.div([], [
    Heading.view({ as: 'h1' }, ['Menus performance'], h),
    h.button([h.Id('menus-tick'), h.DataAttribute('perf', 'menus-tick'), h.OnClick(Message.Tick())], ['Unrelated update']),
    ...model.menus.map((menu, index) => keyedMenu(menu.id, renderMenu, [
      menu.model, menu.id, index, h, inputs.accentColor, inputs.grayColor, inputs.radius, inputs.scaling, inputs.appearance, inputs.panelBackground,
    ])),
  ])),
})
