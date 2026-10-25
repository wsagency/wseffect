import { Option, Schema } from 'effect'
import { Command } from '@wsagency/wseffect-foldkit'
import type { Update } from '@wsagency/wseffect-foldkit'
import type { AnyPage, MessageOf, ModelOf, OutMessageOf, ServicesOf } from '../contract.js'
import type { PagesHandle } from '../registry.js'
import type { KitState } from './state.js'
import type { PageSlot, PageSlots } from '../slots.js'
export function foldPage<
  Pages extends Record<string, AnyPage>,
  Key extends keyof Pages & string,
  KitMessage extends object,
>(
  config: Readonly<{
    pages: PagesHandle<Pages>
    key: Key
    toParentMessage: (message: MessageOf<Pages[Key]>) => KitMessage
  }>,
): (
  state: KitState<Pages>,
  message: MessageOf<Pages[Key]>,
) => Update.ReturnWithOutMessage<
  KitState<Pages>,
  KitMessage,
  OutMessageOf<Pages[Key]>,
  ServicesOf<Pages[Key]>
> {
  return (state, message) => {
    const page = Option.getOrUndefined(config.pages.registry.get(config.key))
    if (page === undefined) return { model: state }
    const slot = state.slots[config.key] as PageSlot<ModelOf<Pages[Key]>>
    if (slot._tag !== 'Ready') return { model: state }
    const result = page.update(slot.model, message) as Update.ReturnWithOutMessage<
      ModelOf<Pages[Key]>,
      MessageOf<Pages[Key]>,
      OutMessageOf<Pages[Key]>,
      ServicesOf<Pages[Key]>
    >
    return {
      model: {
        ...state,
        slots: {
          ...state.slots,
          [config.key]: { _tag: 'Ready', model: result.model },
        } as PageSlots<Pages>,
      },
      commands: result.commands?.map((command) => Command.mapMessage(command, config.toParentMessage)) ?? [],
      outMessage: result.outMessage,
    }
  }
}


const modelJsonCodecs = new WeakMap<object, Schema.Codec<unknown, Schema.Json>>()

function jsonCodecOf(schema: Schema.Codec<unknown, unknown>): Schema.Codec<unknown, Schema.Json> {
  let codec = modelJsonCodecs.get(schema)
  if (codec === undefined) {
    codec = Schema.toCodecJson(schema) as Schema.Codec<unknown, Schema.Json>
    modelJsonCodecs.set(schema, codec)
  }
  return codec
}

export function activate<Pages extends Record<string, AnyPage>, Key extends keyof Pages & string, ParentMessage>(
  pages: PagesHandle<Pages>,
  slots: PageSlots<Pages>,
  key: Key,
  toParentMessage: (message: MessageOf<Pages[Key]>) => ParentMessage,
): Readonly<{ slots: PageSlots<Pages>; commands: ReadonlyArray<Command.Command<ParentMessage>> }> {
  const current = slots[key] as PageSlot<ModelOf<Pages[Key]>>
  const unchanged = { slots, commands: [] as ReadonlyArray<Command.Command<ParentMessage>> }
  return Option.match(pages.registry.get(key), {
    onNone: () => unchanged,
    onSome: (page) => {
      if (current._tag === 'Ready') return unchanged
      if (current._tag === 'Dehydrated') {
        const restored = Schema.decodeUnknownOption(jsonCodecOf(page.Model))(current.encoded)
        if (Option.isSome(restored)) {
          return {
            slots: { ...slots, [key]: { _tag: 'Ready', model: restored.value as ModelOf<Pages[Key]> } } as PageSlots<Pages>,
            commands: unchanged.commands,
          }
        }
      }
      const initialized = page.init() as Update.Return<ModelOf<Pages[Key]>, MessageOf<Pages[Key]>>
      return {
        slots: { ...slots, [key]: { _tag: 'Ready', model: initialized.model } } as PageSlots<Pages>,
        commands: initialized.commands?.map((command) => Command.mapMessage(command, toParentMessage)) ?? [],
      }
    },
  })
}

export type KitPageMessagePayload<
  Pages extends Record<string, AnyPage>,
  Key extends keyof Pages & string,
> = Readonly<{ message: MessageOf<Pages[Key]> }>

export type KitPageMessageHandler<
  Pages extends Record<string, AnyPage>,
  Key extends keyof Pages & string,
> = (payload: KitPageMessagePayload<Pages, Key>) => unknown

function hasPageMessagePayload<Payload extends { readonly message: unknown }>(
  payload: unknown,
): payload is Payload {
  return payload !== null && typeof payload === 'object' && 'message' in payload
}

export interface KitMessageMatcher<Message> {
  match(message: Message, handlers: Record<string, (payload: unknown) => unknown>): unknown
}

export interface KitUpdateCommands<Message> {
  readonly LoadPageForPrefetch: Command.CommandDefinition
  readonly ReloadDocument: Command.CommandDefinition
  readonly makePrefetch: (key: string, source: 'intent' | 'visible') => Command.Command<Message>
  readonly reload: () => Command.Command<Message>
}

export interface KitUpdateConfig<Pages extends Record<string, AnyPage>, KitMessage extends object> {
  readonly pages: PagesHandle<Pages>
  readonly KitMessage: KitMessageMatcher<KitMessage>
  readonly pageMessageTags: { readonly [Key in keyof Pages]: string }
  readonly toParentMessage: { readonly [Key in keyof Pages]: (message: MessageOf<Pages[Key]>) => KitMessage }
  readonly commands: KitUpdateCommands<KitMessage>
}

export function makeKitUpdate<Pages extends Record<string, AnyPage>, KitMessage extends object>(
  config: KitUpdateConfig<Pages, KitMessage>,
): (state: KitState<Pages>, message: KitMessage) => Update.ReturnWithOutMessage<
  KitState<Pages>, KitMessage, OutMessageOf<Pages[keyof Pages]>, ServicesOf<Pages[keyof Pages]>
> {
  const tagToKey = new Map(Object.entries(config.pageMessageTags).map(([key, tag]) => [tag, key as keyof Pages & string]))
  return (state, message) => {
    const fields: Record<string, (payload: unknown) => unknown> = {
      EnteredRoute: (payload) => {
        const { keys } = payload as { readonly keys: ReadonlyArray<keyof Pages & string> }
        let slots = state.slots
        const commands: Array<ReadonlyArray<Command.Command<KitMessage>>> = []
        for (const key of keys) {
          if (!config.pages.keys.includes(key)) continue
          const slot = slots[key] as PageSlot<ModelOf<Pages[typeof key]>>
          if (slot._tag === 'Available') {
            const activated = activate(config.pages, slots, key, config.toParentMessage[key])
            slots = activated.slots
            commands.push(activated.commands)
          } else if (slot._tag === 'Idle' || (slot._tag === 'Failed' && slot.cause !== 'NewVersion')) {
            slots = { ...slots, [key]: { _tag: 'Loading' } } as PageSlots<Pages>
          }
        }
        return { model: { ...state, activeKeys: keys, slots }, commands: commands.flat() }
      },
      LoadedPageModule: (payload) => {
        const { key } = payload as { readonly key: keyof Pages & string }
        const activated = activate(config.pages, state.slots, key, config.toParentMessage[key])
        return { model: { ...state, slots: activated.slots }, commands: activated.commands }
      },
      FailedPageModule: (payload) => {
        const { key, cause, reason } = payload as {
          readonly key: keyof Pages & string
          readonly cause: 'Offline' | 'NewVersion' | 'LoadError'
          readonly reason: string
        }
        return { model: { ...state, slots: { ...state.slots, [key]: { _tag: 'Failed', cause, reason } } } }
      },
      RequestedPrefetch: (payload) => {
        const { key, source } = payload as { readonly key: keyof Pages & string; readonly source?: 'intent' | 'visible' }
        const prefetchIsSpeculative = (source ?? 'intent') === 'visible'
        const routeLoadInFlight = state.activeKeys.some((pageKey) => {
          const slot = state.slots[pageKey]
          return slot._tag === 'Loading' || slot._tag === 'Dehydrated'
        })
        return state.slots[key]._tag === 'Idle' && !(prefetchIsSpeculative && routeLoadInFlight)
          ? { model: state, commands: [config.commands.makePrefetch(key, source ?? 'intent')] }
          : { model: state }
      },
      CompletedPrefetch: (payload) => {
        const { key, isLoaded } = payload as { readonly key: keyof Pages & string; readonly isLoaded: boolean }
        return {
          model: state.slots[key]._tag === 'Idle'
            ? { ...state, slots: { ...state.slots, [key]: isLoaded ? { _tag: 'Available' } : { _tag: 'Idle' } } }
            : state,
        }
      },
      ClickedRetryPage: (payload) => {
        const { key } = payload as { readonly key: keyof Pages & string }
        const slot = state.slots[key]
        return slot._tag === 'Failed' && slot.cause !== 'NewVersion'
          ? { model: { ...state, slots: { ...state.slots, [key]: { _tag: 'Loading' } } } }
          : { model: state }
      },
      ClickedReloadPage: (payload) => {
        const { key } = payload as { readonly key: keyof Pages & string }
        const slot = state.slots[key]
        return slot._tag === 'Failed' && slot.cause === 'NewVersion'
          ? { model: state, commands: [config.commands.reload()] }
          : { model: state }
      },
      GotPwaEvent: (payload) => {
        const { event } = payload as { readonly event: { readonly _tag: string; readonly isOnline?: boolean } }
        switch (event._tag) {
          case 'ChangedOnlineStatus': return { model: { ...state, pwa: { ...state.pwa, isOnline: event.isOnline === true } } }
          case 'OfflineReady': return { model: { ...state, pwa: { ...state.pwa, isOfflineReady: true } } }
          case 'UpdateAvailable': return { model: { ...state, pwa: { ...state.pwa, isUpdateAvailable: true } } }
          default: return { model: state }
        }
      },
      NewVersionAvailable: (payload) => {
        const { buildId } = payload as { readonly buildId: string }
        return {
          model: { ...state, pwa: { ...state.pwa, isUpdateAvailable: true, maybeNewBuildId: Option.some(buildId) } },
        }
      },
      ClickedApplyUpdate: () => ({ model: state, commands: [config.commands.reload()] }),
      CompletedApplyUpdate: () => ({ model: { ...state, pwa: { ...state.pwa, isUpdateAvailable: false } } }),
      FailedApplyUpdate: () => ({ model: state }),
    }
    for (const [tag, key] of tagToKey) {
      const fold = foldPage({
        pages: config.pages,
        key,
        toParentMessage: config.toParentMessage[key],
      })
      fields[tag] = (payload) => {
        if (!hasPageMessagePayload<KitPageMessagePayload<Pages, typeof key>>(payload)) return { model: state }
        return fold(state, payload.message)
      }
    }
    return config.KitMessage.match(message, fields) as Update.ReturnWithOutMessage<
      KitState<Pages>, KitMessage, OutMessageOf<Pages[keyof Pages]>, ServicesOf<Pages[keyof Pages]>
    >
  }
}
