import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import { bindKit } from '../../src/kit/binding.js'
import { kitMessageFields } from '../../src/kit/messages.js'
import { makePages, messageSchema } from '../../src/registry.js'
import { initKit } from '../../src/kit/state.js'
import { alphaPage, Message as AlphaMessage, OutMessage as AlphaOutMessage } from './pages/alpha.js'
import { betaPage } from './pages/beta.js'

export const alphaMessage = AlphaMessage.AlphaPing()
export const alphaOutMessage = AlphaOutMessage.ShiftDay({ days: 1 })

export const makeKitFixture = () => {
  const pages = makePages({
    alpha: async () => alphaPage,
    beta: async () => betaPage,
  })
  const generatedFields = kitMessageFields(pages)
  const KitMessage = defineMessageUnion({
    ...generatedFields,
    GotAlphaPageMessage: { message: messageSchema(pages, 'alpha') },
    GotBetaPageMessage: { message: messageSchema(pages, 'beta') },
  })
  const pageMessageTags = {
    alpha: 'GotAlphaPageMessage',
    beta: 'GotBetaPageMessage',
  } as const
  const binding = bindKit({ pages, KitMessage, pageMessageTags })
  const initial = () => initKit(pages, [])
  return {
    pages,
    KitMessage,
    binding,
    initial,
    alphaInitial: () => initKit(pages, ['alpha']),
  }
}
