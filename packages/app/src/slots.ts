import type { Schema as SchemaTypes } from 'effect'
import type { ModelOf } from './contract.js'

export type FailureCause = 'Offline' | 'NewVersion' | 'LoadError'

export type PageSlot<Model> =
  | Readonly<{ _tag: 'Idle' }>
  | Readonly<{ _tag: 'Available' }>
  | Readonly<{ _tag: 'Loading' }>
  | Readonly<{ _tag: 'Failed'; cause: FailureCause; reason: string }>
  | Readonly<{ _tag: 'Ready'; model: Model }>
  | Readonly<{ _tag: 'Dehydrated'; encoded: SchemaTypes.Json }>

export type PageSlots<Pages> = {
  readonly [Key in keyof Pages]: PageSlot<ModelOf<Pages[Key]>>
}

export const Slot = {
  Idle: { _tag: 'Idle' } as PageSlot<never>,
  Available: { _tag: 'Available' } as PageSlot<never>,
  Loading: { _tag: 'Loading' } as PageSlot<never>,
  failed: (cause: FailureCause, reason: string): PageSlot<never> => ({ _tag: 'Failed', cause, reason }),
  ready: <Model>(model: Model): PageSlot<Model> => ({ _tag: 'Ready', model }),
  dehydrated: (encoded: SchemaTypes.Json): PageSlot<never> => ({ _tag: 'Dehydrated', encoded }),
}
