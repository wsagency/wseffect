import { Effect, Layer, Option, Stream } from 'effect'
import type { AnyPage } from './contract.js'
import * as Runtime from '@wsagency/wseffect-foldkit/runtime'
import { Subscription } from '@wsagency/wseffect-foldkit'
import type { Subscription as SubscriptionType } from '@wsagency/wseffect-foldkit'
import { BUILD_ID } from './buildId.js'
import type { KitBinding } from './kit/binding.js'
import type { KitState } from './kit/state.js'
import { ServiceWorker } from './pwa/serviceWorker.js'
import { versionPollSubscription } from './versionPoll.js'
import type { PwaEvent } from './kit/messages.js'

type ReservedSubscriptionKeys<Subscriptions> = Extract<keyof Subscriptions, `wseffect:${string}`>
type SubscriptionKeyCheck<Subscriptions> = ReservedSubscriptionKeys<Subscriptions> extends never
  ? unknown
  : { readonly [Key in ReservedSubscriptionKeys<Subscriptions>]: never }

type ResourceConfig<Resources> = [Resources] extends [never]
  ? { readonly resources?: Layer.Layer<never> }
  : { readonly resources: Layer.Layer<Resources> }

export type MakeAppConfig<Model, Message extends { _tag: string }, Pages extends Record<string, AnyPage>, KitMessage extends { _tag: string }, Resources = never,
  UserSubscriptions extends SubscriptionType.Subscriptions<Model, Message, Resources | ServiceWorker> = {}> =
  Omit<Runtime.RoutingApplicationConfig<Model, Message, Resources | ServiceWorker>, 'resources' | 'subscriptions'> &
  ResourceConfig<Resources> & {
    readonly subscriptions?: UserSubscriptions & SubscriptionKeyCheck<UserSubscriptions>
    readonly kit: Readonly<{
      binding: KitBinding<Pages, KitMessage>
      read: (model: Model) => KitState<Pages>
      toParentMessage: (message: KitMessage) => Message
    }>
    readonly versionPollMs?: number
  }

function serviceWorkerSubscriptions<Model, Message extends { _tag: string }>(mapEvent: (event: PwaEvent) => Message) {
  return Subscription.make<Model, Message>()((entry) => ({
    'wseffect:service-worker': entry({}, {
      modelToDependencies: () => ({}),
      dependenciesToStream: () => Stream.map(Stream.unwrap(Effect.map(
        Effect.serviceOption(ServiceWorker),
        Option.match({ onNone: () => Stream.empty, onSome: (service) => service.events }),
      )), mapEvent),
    }),
  }))
}

export function makeApp<Model, Message extends { _tag: string }, Pages extends Record<string, AnyPage>, KitMessage extends { _tag: string }, Resources = never,
  UserSubscriptions extends SubscriptionType.Subscriptions<Model, Message, Resources | ServiceWorker> = {}>(
  config: MakeAppConfig<Model, Message, Pages, KitMessage, Resources, UserSubscriptions>,
): Runtime.MakeRuntimeReturn<undefined, void, Resources | ServiceWorker, 'Application'> {
  const pageSubscriptions = Subscription.lift(config.kit.binding.subscriptions)<Model, Message>({
    read: (model) => Option.some(config.kit.read(model)),
    toParentMessage: config.kit.toParentMessage,
  })
  const pollSubscriptions = Subscription.lift(versionPollSubscription({
    intervalMs: config.versionPollMs ?? 300_000,
    runningBuildId: BUILD_ID,
    newVersionAvailable: config.kit.binding.messages.newVersionAvailable,
  }))<Model, Message>({
    read: () => Option.some(undefined),
    toParentMessage: config.kit.toParentMessage,
  })
  const pwaSubscriptions = __WSEFFECT_PWA__
    ? serviceWorkerSubscriptions<Model, Message>((event) => config.kit.toParentMessage(config.kit.binding.messages.gotPwaEvent(event)))
    : {}
  const subscriptions = Subscription.aggregate<Model, Message, Resources | ServiceWorker>()(
    config.subscriptions ?? {},
    pageSubscriptions,
    pollSubscriptions,
    pwaSubscriptions,
  )
  const resources = Layer.merge(config.resources ?? Layer.empty, ServiceWorker.layer) as Layer.Layer<Resources | ServiceWorker>
  const makeRoutingApplication: (
    config: Runtime.RoutingApplicationConfig<Model, Message, Resources | ServiceWorker, never, undefined>,
  ) => Runtime.MakeRuntimeReturn<undefined, void, Resources | ServiceWorker, 'Application'> = Runtime.makeApplication
  return makeRoutingApplication({
    ...config,
    resources,
    subscriptions,
  })
}
