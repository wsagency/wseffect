import { Effect, Schema, Stream } from 'effect'
import { Command, Subscription } from 'foldkit'
import type { Update } from 'foldkit'
import type { AnyPage, MessageOf, OutMessageOf, ServicesOf } from '../contract.js'
import { ensure, PageLoadError } from '../loader.js'
import type { PagesHandle } from '../registry.js'
import { classifyFailure } from './classify.js'
import type { KitState } from './state.js'
import { makeKitUpdate } from './update.js'
import type { KitMessageMatcher } from './update.js'

const FailureCause = Schema.Literals(['Offline', 'NewVersion', 'LoadError'])

function messageConstructor<Message>(union: object, tag: string, payload: unknown): Message {
  const candidate = (union as Record<string, unknown>)[tag]
  if (typeof candidate !== 'function') throw new Error(`KitMessage is missing constructor ${tag}`)
  return (candidate as (value: unknown) => Message)(payload)
}

function messageDefinition<Message>(union: object, tag: string): Schema.Codec<Message, unknown> {
  const candidate = (union as Record<string, unknown>)[tag]
  if (typeof candidate !== 'function') throw new Error(`KitMessage is missing schema ${tag}`)
  return candidate as Schema.Codec<Message, unknown>
}

export interface BindKitConfig<Pages extends Record<string, AnyPage>, KitMessage extends object> {
  readonly pages: PagesHandle<Pages>
  readonly KitMessage: { readonly Type: KitMessage }
  readonly pageMessageTags: { readonly [Key in keyof Pages]: string }
}

export interface KitBinding<Pages extends Record<string, AnyPage>, KitMessage extends object> {
  readonly pages: PagesHandle<Pages>
  readonly toParentMessage: { readonly [Key in keyof Pages]: (message: MessageOf<Pages[Key]>) => KitMessage }
  readonly update: (state: KitState<Pages>, message: KitMessage) => Update.ReturnWithOutMessage<
    KitState<Pages>, KitMessage, OutMessageOf<Pages[keyof Pages]>, ServicesOf<Pages[keyof Pages]>
  >
  readonly subscriptions: Readonly<Record<string, Subscription.Subscription<KitState<Pages>, KitMessage, { readonly isNeeded: boolean }>>>
  readonly commands: {
    readonly LoadPageForPrefetch: Command.CommandDefinition
    readonly ClassifyPageFailure: Command.CommandDefinition
    readonly ReloadDocument: Command.CommandDefinition
  }
}


export function bindKit<Pages extends Record<string, AnyPage>, KitMessage extends object>(config: BindKitConfig<Pages, KitMessage>): KitBinding<Pages, KitMessage> {
  const { pages, KitMessage: union } = config
  type Key = keyof Pages & string
  const keySchema = pages.keys.length > 0
    ? Schema.Literals(pages.keys as readonly [Key, ...Key[]])
    : Schema.String
  const failedPage = (key: string, cause: string, reason: string) =>
    messageConstructor<KitMessage>(union, 'FailedPageModule', { key, cause, reason })
  const completedPrefetch = (key: string, isLoaded: boolean) =>
    messageConstructor<KitMessage>(union, 'CompletedPrefetch', { key, isLoaded })
  const classifyLoadFailure = (key: string, reason: string) => Effect.map(classifyFailure({
    isOnline: typeof navigator === 'undefined' || navigator.onLine,
    fetchVersion: Effect.tryPromise({
      try: () => fetch('/version.json', { cache: 'no-store' }),
      catch: (cause) => cause,
    }),
    runningBuildId: (globalThis as typeof globalThis & { __WSEFFECT_BUILD_ID__?: string }).__WSEFFECT_BUILD_ID__ ?? '',
  }), (cause) => failedPage(key, cause, reason))
  const loadFailureReason = (error: PageLoadError) =>
    error.cause instanceof Error ? error.cause.message : String(error.cause)
  const completedApply = () => messageConstructor<KitMessage>(union, 'CompletedApplyUpdate', {})
  const failedApply = (reason: string) => messageConstructor<KitMessage>(union, 'FailedApplyUpdate', { reason })
  const LoadPageForPrefetch = Command.define('LoadPageForPrefetch', {
    args: { key: keySchema },
    messages: [messageDefinition<KitMessage>(union, 'CompletedPrefetch')],
    execute: ({ key }) => Effect.catch(
      Effect.as(ensure(pages, key), completedPrefetch(key, true)),
      () => Effect.succeed(completedPrefetch(key, false)),
    ),
  })
  const ClassifyPageFailure = Command.define('ClassifyPageFailure', {
    args: { key: keySchema, reason: Schema.String },
    messages: [messageDefinition<KitMessage>(union, 'FailedPageModule')],
    execute: ({ key, reason }) => classifyLoadFailure(key, reason),
  })
  const ReloadDocument = Command.define('ReloadDocument', {
    messages: [messageDefinition<KitMessage>(union, 'CompletedApplyUpdate'), messageDefinition<KitMessage>(union, 'FailedApplyUpdate')],
    execute: Effect.match(Effect.try({
      try: () => {
        if (typeof location !== 'undefined') location.reload()
      },
      catch: (cause) => new Error(String(cause)),
    }), {
      onFailure: (error) => failedApply(error.message),
      onSuccess: completedApply,
    }),
  })
  const commands = { LoadPageForPrefetch, ClassifyPageFailure, ReloadDocument }
  const toParentMessage = Object.fromEntries(pages.keys.map((key) => [
    key,
    (message: MessageOf<Pages[typeof key]>) => messageConstructor<KitMessage>(
      union,
      config.pageMessageTags[key],
      { message },
    ),
  ])) as { readonly [Key in keyof Pages]: (message: MessageOf<Pages[Key]>) => KitMessage }
  const subscriptions = Subscription.make<KitState<Pages>, KitMessage>()((entry) =>
    Object.fromEntries(pages.keys.map((key) => [
      `wseffect:load:${key}`,
      entry(
        { isNeeded: Schema.Boolean },
        {
          modelToDependencies: (state) => {
            const slot = state.slots[key]
            return {
              isNeeded: state.activeKeys.includes(key) && (slot._tag === 'Loading' || slot._tag === 'Dehydrated'),
            }
          },
          dependenciesToStream: ({ isNeeded }) => isNeeded
            ? Stream.fromEffect(Effect.matchEffect(ensure(pages, key), {
              onSuccess: () => Effect.succeed(messageConstructor<KitMessage>(union, 'LoadedPageModule', { key })),
              onFailure: (error) => classifyLoadFailure(key, loadFailureReason(error)),
            }))
            : Stream.empty,
        },
      ),
    ])) as Record<string, Subscription.Subscription<KitState<Pages>, KitMessage, { readonly isNeeded: boolean }>>,
  )
  const update = makeKitUpdate({
    pages,
    KitMessage: union as unknown as KitMessageMatcher<KitMessage>,
    pageMessageTags: config.pageMessageTags,
    toParentMessage,
    commands: {
      LoadPageForPrefetch,
      ReloadDocument,
      makePrefetch: (key) => LoadPageForPrefetch({ key }) as unknown as Command.Command<KitMessage>,
      reload: () => ReloadDocument() as unknown as Command.Command<KitMessage>,
    },
  })
  return { pages, toParentMessage, update, subscriptions, commands }
}
