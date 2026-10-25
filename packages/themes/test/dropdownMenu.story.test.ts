import { Schema } from 'effect'
import * as Option from 'effect/Option'
import * as Story from '@wsagency/wseffect-foldkit/story'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import { describe, it } from 'vitest'
import * as DropdownMenu from '../src/components/dropdown-menu.js'

const Menu = DropdownMenu.create<'edit' | 'delete'>()
const ParentMessage = defineMessageUnion({ GotMenu: { message: Menu.Message } })
const ParentOutMessage = defineMessageUnion({ Selected: { value: Schema.String, index: Schema.Number } })
type ParentModel = Readonly<{ menu: typeof Menu.Model.Type }>
type ParentMessage = typeof ParentMessage.Type
type ParentOutMessage = typeof ParentOutMessage.Type
const foldMenu = Menu.fold<ParentModel, ParentMessage, ParentOutMessage>({
  read: model => Option.some(model.menu),
  write: (model, menu) => ({ ...model, menu }),
  toParentMessage: message => ParentMessage.GotMenu({ message }),
  foldOutMessage: outMessage => model => ({
    model,
    outMessage: ParentOutMessage.Selected({ value: outMessage.value, index: outMessage.index }),
  }),
})
const update = (model: ParentModel, message: ParentMessage) => ParentMessage.match(message, {
  GotMenu: ({ message: childMessage }) => foldMenu(model, childMessage),
})

describe('DropdownMenu wrapper', () => {
  it('forwards a selected item to the parent OutMessage', () => {
    Story.story(
      update,
      Story.given({ menu: Menu.init({ id: 'actions' }) }),
      Story.message(ParentMessage.GotMenu({ message: Menu.Message.SelectedItem({ index: 0, item: 'edit' }) })),
      Story.expectOutMessage(ParentOutMessage.Selected({ value: 'edit', index: 0 })),
    )
  })
})
