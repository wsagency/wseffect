import type { Schema } from 'effect'
import type { Submodel, Update } from 'foldkit'

export type PageInputsShape = Readonly<Record<string, string | number | boolean | null>>

export interface PageDefinition<Model, Message, Inputs extends PageInputsShape, OutMessage, R = never> {
  readonly Model: Schema.Codec<Model, any, never, never>
  readonly Message: Schema.Codec<Message, any, never, never>
  readonly init: () => Update.Return<Model, Message, R>
  readonly update: (model: Model, message: Message) => Update.ReturnWithOutMessage<Model, Message, OutMessage, R>
  readonly view: Submodel.View<Model, Message, Inputs>
}

export type AnyPage = PageDefinition<any, any, any, any, any>
export type ModelOf<P> = P extends PageDefinition<infer Model, any, any, any, any> ? Model : never
export type MessageOf<P> = P extends PageDefinition<any, infer Message, any, any, any> ? Message : never
export type InputsOf<P> = P extends PageDefinition<any, any, infer Inputs, any, any> ? Inputs : never
export type OutMessageOf<P> = P extends PageDefinition<any, any, any, infer OutMessage, any> ? OutMessage : never
export type ServicesOf<P> = P extends PageDefinition<any, any, any, any, infer R> ? R : never

export interface PageContract<Inputs extends PageInputsShape, OutMessage> {
  readonly OutMessage: Schema.Codec<OutMessage, any>
  readonly definePage: <Model, Message, R = never>(
    page: PageDefinition<Model, Message, Inputs, OutMessage, R>,
  ) => PageDefinition<Model, Message, Inputs, OutMessage, R>
}

export function pageContract<Inputs extends PageInputsShape, OutMessage extends { readonly _tag: string }>(config: {
  readonly OutMessage: Schema.Codec<OutMessage, any>
}): PageContract<Inputs, OutMessage> {
  return {
    OutMessage: config.OutMessage,
    definePage: (page) => page,
  }
}
