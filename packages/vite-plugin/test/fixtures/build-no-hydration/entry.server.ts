import { Server } from '@wsagency/wseffect-foldkit/experimental'

export const renderDocument = Server.renderDocument

export const renderPage = async (): Promise<Server.EntryResult> =>
  Server.Responded(new Response(null, { status: 204 }))
