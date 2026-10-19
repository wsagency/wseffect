import { defineTaggedUnion } from 'foldkit/schema'
import { Schema } from 'effect'
import type { AnyPage, MessageOf } from '../contract.js'
import type { PagesHandle } from '../registry.js'
import { messageSchema } from '../registry.js'

export const PwaEvent = defineTaggedUnion({
  UpdateAvailable: {},
  OfflineReady: {},
  RegisterFailed: { reason: Schema.String },
  ChangedOnlineStatus: { isOnline: Schema.Boolean },
})
export type PwaEvent = typeof PwaEvent.Type

export type KitMessageFields<Pages extends Record<string, AnyPage>> = {
  readonly EnteredRoute: { readonly keys: Schema.Codec<ReadonlyArray<keyof Pages & string>, unknown> }
  readonly LoadedPageModule: { readonly key: Schema.Codec<keyof Pages & string, unknown> }
  readonly FailedPageModule: {
    readonly key: Schema.Codec<keyof Pages & string, unknown>
    readonly cause: typeof FailureCauseSchema
    readonly reason: typeof Schema.String
  }
  readonly ClickedRetryPage: { readonly key: Schema.Codec<keyof Pages & string, unknown> }
  readonly ClickedReloadPage: { readonly key: Schema.Codec<keyof Pages & string, unknown> }
  readonly RequestedPrefetch: { readonly key: Schema.Codec<keyof Pages & string, unknown> }
  readonly CompletedPrefetch: { readonly key: Schema.Codec<keyof Pages & string, unknown>; readonly isLoaded: typeof Schema.Boolean }
  readonly GotPwaEvent: { readonly event: typeof PwaEvent }
  readonly NewVersionAvailable: { readonly buildId: typeof Schema.String }
  readonly ClickedApplyUpdate: Record<string, never>
  readonly CompletedApplyUpdate: Record<string, never>
  readonly FailedApplyUpdate: { readonly reason: typeof Schema.String }
} & {
  readonly [Key in keyof Pages & string as `Got${Capitalize<Key>}PageMessage`]: {
    readonly message: Schema.Codec<MessageOf<Pages[Key]>, unknown>
  }
}

const FailureCauseSchema = Schema.Literals(['Offline', 'NewVersion', 'LoadError'])

type PageKey<Pages extends Record<string, AnyPage>> = keyof Pages & string

export function kitMessageFields<Pages extends Record<string, AnyPage>>(
  pages: PagesHandle<Pages>,
): KitMessageFields<Pages> {
  type Key = PageKey<Pages>
  const keys = pages.keys as readonly [Key, ...Key[]]
  const PageKeySchema = keys.length > 0 ? Schema.Literals(keys) : Schema.String
  const pageFields = Object.fromEntries(pages.keys.map((key) => [
    `Got${key.charAt(0).toUpperCase()}${key.slice(1)}PageMessage`,
    { message: messageSchema(pages, key) },
  ]))
  const base = {
    EnteredRoute: { keys: Schema.Array(PageKeySchema) },
    LoadedPageModule: { key: PageKeySchema },
    FailedPageModule: { key: PageKeySchema, cause: FailureCauseSchema, reason: Schema.String },
    ClickedRetryPage: { key: PageKeySchema },
    ClickedReloadPage: { key: PageKeySchema },
    RequestedPrefetch: { key: PageKeySchema },
    CompletedPrefetch: { key: PageKeySchema, isLoaded: Schema.Boolean },
    GotPwaEvent: { event: PwaEvent },
    NewVersionAvailable: { buildId: Schema.String },
    ClickedApplyUpdate: {},
    CompletedApplyUpdate: {},
    FailedApplyUpdate: { reason: Schema.String },
  }
  return { ...base, ...pageFields } as unknown as KitMessageFields<Pages>
}
