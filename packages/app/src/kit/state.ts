import { Option, Schema } from 'effect'
import type { AnyPage } from '../contract.js'
import type { PagesHandle } from '../registry.js'
import { slotsSchema } from '../slotCodec.js'
import type { PageSlots } from '../slots.js'

export const PwaState = Schema.Struct({
  isOnline: Schema.Boolean,
  isOfflineReady: Schema.Boolean,
  isUpdateAvailable: Schema.Boolean,
  maybeNewBuildId: Schema.Option(Schema.String),
})
export type PwaState = typeof PwaState.Type

export interface KitState<Pages extends Record<string, AnyPage>> {
  readonly activeKeys: ReadonlyArray<keyof Pages & string>
  readonly slots: PageSlots<Pages>
  readonly pwa: PwaState
}

export function kitStateSchema<Pages extends Record<string, AnyPage>>(
  pages: PagesHandle<Pages>,
): Schema.Codec<KitState<Pages>, any, never, never> {
  return Schema.Struct({
    activeKeys: Schema.Array(Schema.String),
    slots: slotsSchema(pages),
    pwa: PwaState,
  }) as unknown as Schema.Codec<KitState<Pages>, any, never, never>
}

export function initKit<Pages extends Record<string, AnyPage>>(
  pages: PagesHandle<Pages>,
  activeKeys: ReadonlyArray<keyof Pages & string>,
): KitState<Pages> {
  const slots = Object.fromEntries(pages.keys.map((key) => [key, { _tag: 'Idle' as const }])) as PageSlots<Pages>
  return {
    activeKeys,
    slots,
    pwa: {
      isOnline: true,
      isOfflineReady: false,
      isUpdateAvailable: false,
      maybeNewBuildId: Option.none(),
    },
  }
}
