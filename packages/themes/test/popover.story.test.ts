import * as UiPopover from '@foldkit/ui/popover'
import * as Story from 'foldkit/story'
import { defineMessageUnion } from 'foldkit/message'
import { describe, expect, it } from 'vitest'
import * as Popover from '../src/components/popover.js'

const ParentMessage = defineMessageUnion({ Popover: { message: Popover.Message } })
type ParentMessage = typeof ParentMessage.Type
type ParentModel = { popover: Popover.Model }
const send = (message: Popover.Message): ParentMessage => ParentMessage.Popover({ message })
const update = (model: ParentModel, message: ParentMessage) => ParentMessage.match(message, {
  Popover: ({ message: child }) => {
    const result = UiPopover.update(model.popover, child)
    return { ...result, model: { ...model, popover: result.model } }
  },
})

describe('Popover wrapper', () => {
  it('defaults to nonmodal and supports modal mode', () => {
    const nonmodal = Popover.init({ id: 'nonmodal' })
    const modal = Popover.init({ id: 'modal', isModal: true })
    expect(nonmodal.isModal).toBe(false)
    expect(modal.isModal).toBe(true)
    Story.story(update, Story.given({ popover: nonmodal }), Story.message(send(Popover.Message.RequestedOpen())), Story.model(model => expect(model.popover.isOpen).toBe(true)))
  })
})
