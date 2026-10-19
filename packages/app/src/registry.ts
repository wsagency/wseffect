import { Effect, Option, Schema, SchemaTransformation } from 'effect'
import type { AnyPage, MessageOf } from './contract.js'

export type PageLoaders<Pages extends Record<string, AnyPage>> = {
  readonly [Key in keyof Pages]: () => Promise<Pages[Key]>
}

export interface PageRegistry<Pages extends Record<string, AnyPage>> {
  register<Key extends keyof Pages & string>(key: Key, page: Pages[Key]): void
  get<Key extends keyof Pages & string>(key: Key): Option.Option<Pages[Key]>
}

export interface PagesHandle<Pages extends Record<string, AnyPage>> {
  readonly keys: ReadonlyArray<keyof Pages & string>
  readonly loaders: PageLoaders<Pages>
  readonly registry: PageRegistry<Pages>
}

const jsonCodecs = new WeakMap<object, Schema.Codec<any, Schema.Json>>()

function jsonCodecOf(schema: Schema.Codec<any, any>): Schema.Codec<any, Schema.Json> {
  let codec = jsonCodecs.get(schema)
  if (codec === undefined) {
    codec = Schema.toCodecJson(schema) as Schema.Codec<any, Schema.Json>
    jsonCodecs.set(schema, codec)
  }
  return codec
}

export function makePages<Pages extends Record<string, AnyPage>>(loaders: PageLoaders<Pages>): PagesHandle<Pages> {
  type Key = keyof Pages & string
  const keys = Object.keys(loaders) as ReadonlyArray<Key>
  const registered = new Map<Key, Pages[Key]>()
  const registry: PageRegistry<Pages> = {
    register: (key, page) => {
      registered.set(key, page)
    },
    get: <Key extends keyof Pages & string>(key: Key): Option.Option<Pages[Key]> => {
      const page = registered.get(key)
      return (page === undefined ? Option.none() : Option.some(page)) as Option.Option<Pages[Key]>
    },
  }
  return { keys, loaders, registry }
}

export function messageSchema<Pages extends Record<string, AnyPage>, Key extends keyof Pages & string>(
  pages: PagesHandle<Pages>,
  key: Key,
): Schema.Codec<MessageOf<Pages[Key]>, any, never, never> {
  type Message = MessageOf<Pages[Key]>
  const getPage = () => pages.registry.get(key)
  return Schema.declare(
    (value: unknown): value is Message => Option.match(getPage(), {
      onNone: () => false,
      onSome: (page) => Schema.is(page.Message)(value),
    }),
    {
      expected: `PageMessage<${key}>`,
      toCodecJson: () => Schema.link<Message>()(
        Schema.Json,
        SchemaTransformation.transformEffect({
          decode: (json: Schema.Json) => Effect.succeed(Option.match(getPage(), {
            onNone: () => json as Message,
            onSome: (page) => Option.getOrElse(
              Schema.decodeUnknownOption(jsonCodecOf(page.Message))(json),
              () => json as Message,
            ),
          })),
          encode: (message: Message) => Option.match(getPage(), {
            onNone: () => Effect.succeed(message as Schema.Json),
            onSome: (page) => Schema.encodeUnknownEffect(jsonCodecOf(page.Message))(message).pipe(
              Effect.mapError((error) => error.issue),
            ),
          }),
        }),
      ),
    },
  )
}
