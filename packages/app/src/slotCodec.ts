import { Option, Predicate, Schema, SchemaTransformation } from 'effect'
import type { Schema as SchemaTypes } from 'effect'
import type { AnyPage, ModelOf } from './contract.js'
import type { PagesHandle } from './registry.js'
import type { FailureCause, PageSlot, PageSlots } from './slots.js'
const EncodedSlot = Schema.Union([
  Schema.TaggedStruct('Idle', {}),
  Schema.TaggedStruct('Loading', {}),
  Schema.TaggedStruct('Failed', { cause: Schema.Literals(['Offline', 'NewVersion', 'LoadError']), reason: Schema.String }),
  Schema.TaggedStruct('Ready', { model: Schema.Json }),
])
const decodeEncodedSlot = Schema.decodeUnknownOption(EncodedSlot)
const SLOT_TAGS: Record<string, true> = {
  Idle: true,
  Available: true,
  Loading: true,
  Failed: true,
  Ready: true,
  Dehydrated: true,
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
function slotSchema<Pages extends Record<string, AnyPage>, Key extends keyof Pages & string>(
  pages: PagesHandle<Pages>,
  key: Key,
): SchemaTypes.Codec<PageSlot<ModelOf<Pages[Key]>>, any, never, never> {
  type Model = ModelOf<Pages[Key]>
  const decodeSlot = (json: Schema.Json): PageSlot<Model> => Option.match(decodeEncodedSlot(json), {
    onNone: () => ({ _tag: 'Idle' }),
    onSome: (encoded) => {
      switch (encoded._tag) {
        case 'Idle': return { _tag: 'Idle' }
        case 'Loading': return { _tag: 'Loading' }
        case 'Failed': return { _tag: 'Failed', cause: encoded.cause as FailureCause, reason: encoded.reason }
        case 'Ready': return Option.match(pages.registry.get(key), {
          onNone: () => ({ _tag: 'Dehydrated', encoded: encoded.model }),
          onSome: (page) => Option.match(
            Schema.decodeUnknownOption(jsonCodecOf(page.Model))(encoded.model),
            {
              onNone: () => ({ _tag: 'Dehydrated', encoded: encoded.model }),
              onSome: (model) => ({ _tag: 'Ready', model: model as Model }),
            },
          ),
        })
      }
    },
  })
  const encodeSlot = (slot: PageSlot<Model>): Schema.Json => {
    switch (slot._tag) {
      case 'Available': return { _tag: 'Idle' }
      case 'Dehydrated': return { _tag: 'Ready', model: slot.encoded }
      case 'Failed': return { _tag: 'Failed', cause: slot.cause, reason: slot.reason }
      case 'Ready': return Option.match(pages.registry.get(key), {
        onNone: () => ({ _tag: 'Idle' }),
        onSome: (page) => Option.match(
          Schema.encodeUnknownOption(jsonCodecOf(page.Model))(slot.model),
          {
            onNone: () => ({ _tag: 'Idle' }),
            onSome: (model) => ({ _tag: 'Ready', model }),
          },
        ),
      })
      case 'Idle': return { _tag: 'Idle' }
      case 'Loading': return { _tag: 'Loading' }
    }
  }
  return Schema.declare(
    (value: unknown): value is PageSlot<Model> => Predicate.isObject(value) &&
      '_tag' in value && typeof value._tag === 'string' && Object.hasOwn(SLOT_TAGS, value._tag),
    {
      expected: `PageSlot<${key}>`,
      toCodecJson: () => Schema.link<PageSlot<Model>>()(
        Schema.Json,
        SchemaTransformation.transform({ decode: decodeSlot, encode: encodeSlot }),
      ),
    },
  )
}

export function slotsSchema<Pages extends Record<string, AnyPage>>(
  pages: PagesHandle<Pages>,
): SchemaTypes.Codec<PageSlots<Pages>, any, never, never> {
  const fields = Object.fromEntries(pages.keys.map((key) => [key, slotSchema(pages, key)]))
  return Schema.Struct(fields) as unknown as SchemaTypes.Codec<PageSlots<Pages>, any, never, never>
}
