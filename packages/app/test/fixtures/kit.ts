import { defineMessageUnion } from 'foldkit/message'
import { bindKit } from '../../src/kit/binding.js'
import { kitMessageFields } from '../../src/kit/messages.js'
import { makePages, messageSchema } from '../../src/registry.js'
import { initKit } from '../../src/kit/state.js'
import { alphaPage, Message as AlphaMessage, OutMessage as AlphaOutMessage } from './pages/alpha.js'
import { betaPage } from './pages/beta.js'

export const pages = makePages({
  alpha: async () => alphaPage,
  beta: async () => betaPage,
})
const generatedFields = kitMessageFields(pages)
export const KitMessage = defineMessageUnion({
  ...generatedFields,
  GotAlphaPageMessage: { message: messageSchema(pages, 'alpha') },
  GotBetaPageMessage: { message: messageSchema(pages, 'beta') },
})
export const pageMessageTags = {
  alpha: 'GotAlphaPageMessage',
  beta: 'GotBetaPageMessage',
}
export const binding = bindKit({ pages, KitMessage, pageMessageTags })
export const initial = () => initKit(pages, [])
export const alphaInitial = () => initKit(pages, ['alpha'])
export const alphaMessage = AlphaMessage.AlphaPing()
export const alphaOutMessage = AlphaOutMessage.ShiftDay({ days: 1 })
export const idlePageSlots = {
  alpha: { _tag: 'Idle' as const },
  beta: { _tag: 'Idle' as const },
}
export const kitMessageFieldsValue = generatedFields
