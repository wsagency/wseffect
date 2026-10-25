import * as Option from 'effect/Option'
import * as UiPopover from '@wsagency/wseffect-foldkit-ui/popover'
import * as Story from '@wsagency/wseffect-foldkit/story'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
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
  it('folds a child message into its parent model', () => {
    const fold = Popover.fold<ParentModel, ParentMessage, never>({
      read: model => Option.some(model.popover),
      write: (model, popover) => ({ ...model, popover }),
      toParentMessage: send,
      foldOutMessage: () => model => ({ model }),
    })
    const result = fold({ popover: Popover.init({ id: 'folded-popover' }) }, Popover.Message.RequestedOpen())
    expect(result.model.popover.isOpen).toBe(true)
  })
})
