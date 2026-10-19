import { BUILD_ID } from '../buildId.js'
import { Effect, Option, Schema } from 'effect'
import { Command, Submodel, Subscription } from 'foldkit'
import type { Update } from 'foldkit'
import type { AnyPage, MessageOf, OutMessageOf, ServicesOf } from '../contract.js'
import { ensure, loaderSubscriptions, PageLoadError } from '../loader.js'
import type { PagesHandle } from '../registry.js'
import { classifyFailure } from './classify.js'
import type { KitState } from './state.js'
import { makeKitUpdate } from './update.js'
import type { KitMessageMatcher } from './update.js'
import type { KitPageViewInputs } from '../view/page.js'
import { bannerView } from '../view/banner.js'
import { viewPage } from '../view/page.js'
import { ServiceWorker, ServiceWorkerUpdateError } from '../pwa/serviceWorker.js'
import { PwaEvent } from './messages.js'


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
  readonly messages: {
    readonly requestedPrefetch: (key: keyof Pages & string) => KitMessage
    readonly requestedPrefetchSchema: Schema.Codec<KitMessage, unknown>
    readonly clickedRetryPage: (key: keyof Pages & string) => KitMessage
    readonly clickedReloadPage: (key: keyof Pages & string) => KitMessage
    readonly clickedApplyUpdate: () => KitMessage
    readonly newVersionAvailable: (buildId: string) => KitMessage
    readonly gotPwaEvent: (event: typeof PwaEvent.Type) => KitMessage
  }
  readonly view: Submodel.View<KitState<Pages>, KitMessage, KitPageViewInputs<Pages>>
  readonly bannerView: Submodel.View<KitState<Pages>, KitMessage>
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
    runningBuildId: BUILD_ID,
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
    execute: Effect.match(Effect.gen(function*() {
      const service = yield* Effect.serviceOption(ServiceWorker)
      if (Option.isNone(service)) {
        yield* Effect.try({
          try: () => {
            if (typeof location !== 'undefined') location.reload()
          },
          catch: (cause) => new ServiceWorkerUpdateError({ cause }),
        })
        return true
      }
      const hasRegistration = yield* service.value.hasRegistration
      if (!hasRegistration) {
        yield* Effect.try({
          try: () => {
            if (typeof location !== 'undefined') location.reload()
          },
          catch: (cause) => new ServiceWorkerUpdateError({ cause }),
        })
        return true
      }
      yield* service.value.checkForUpdate
      yield* service.value.applyUpdate
      return true
    }), {
      onFailure: (error) => failedApply(String(error.cause)),
      onSuccess: (controllerChanged) => controllerChanged
        ? completedApply()
        : failedApply('No service worker controller change'),
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
  const messages = {
    requestedPrefetch: (key: Key) => messageConstructor<KitMessage>(union, 'RequestedPrefetch', { key }),
    requestedPrefetchSchema: messageDefinition<KitMessage>(union, 'RequestedPrefetch'),
    clickedRetryPage: (key: Key) => messageConstructor<KitMessage>(union, 'ClickedRetryPage', { key }),
    clickedReloadPage: (key: Key) => messageConstructor<KitMessage>(union, 'ClickedReloadPage', { key }),
    clickedApplyUpdate: () => messageConstructor<KitMessage>(union, 'ClickedApplyUpdate', {}),
    newVersionAvailable: (buildId: string) => messageConstructor<KitMessage>(union, 'NewVersionAvailable', { buildId }),
    gotPwaEvent: (event: typeof PwaEvent.Type) => messageConstructor<KitMessage>(union, 'GotPwaEvent', { event }),
  }
  const view = viewPage({ pages, toParentMessage, messages })
  const updateBanner = bannerView(messages.clickedApplyUpdate)
  const subscriptions = loaderSubscriptions<Pages, KitState<Pages>, KitMessage>({
    pages,
    isNeeded: (state, key) => {
      const slot = state.slots[key]
      return state.activeKeys.includes(key) && (slot._tag === 'Loading' || slot._tag === 'Dehydrated')
    },
    onLoaded: (key) => messageConstructor<KitMessage>(union, 'LoadedPageModule', { key }),
    onFailure: (key, error) => classifyLoadFailure(key, loadFailureReason(error)),
  })
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
  return { pages, toParentMessage, update, subscriptions, commands, messages, view, bannerView: updateBanner }
}
