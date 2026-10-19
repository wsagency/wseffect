import type { Layer } from 'effect'
import type { KitBinding } from '../src/kit/binding.js'
import type { KitPageMessageHandler } from '../src/kit/update.js'
import type { MakeAppConfig } from '../src/app.js'
import { makeApp } from '../src/app.js'
import { alphaMessage, makeKitFixture } from './fixtures/kit.js'
import { Message as BetaMessage } from './fixtures/pages/beta.js'

type Fixture = ReturnType<typeof makeKitFixture>


type Binding = Fixture['binding']
type Pages = Binding extends KitBinding<infer P, any> ? P : never
declare const alphaPageHandler: KitPageMessageHandler<Pages, 'alpha'>
alphaPageHandler({ message: alphaMessage })
// @ts-expect-error beta page messages cannot be handled as alpha page messages
alphaPageHandler({ message: BetaMessage.BetaPing() })
type Message = any
type KitMessage = any
type Model = unknown
type Clock2 = { readonly _tag: 'Clock2' }

declare const configWithoutResources: Omit<
  MakeAppConfig<Model, Message, Pages, KitMessage, Clock2>,
  'resources'
>
declare const clock2Layer: Layer.Layer<Clock2>

// @ts-expect-error update effects that need Clock2 require its boot resource layer
makeApp<Model, Message, Pages, Message, Clock2>(configWithoutResources)
makeApp<Model, Message, Pages, Message, Clock2>({ ...configWithoutResources, resources: clock2Layer })
type ClockConfig = MakeAppConfig<Model, Message, Pages, KitMessage, Clock2>
declare const inferredUpdate: ClockConfig['update']
declare const inferredRest: Omit<ClockConfig, 'update' | 'resources'>

// @ts-expect-error makeApp infers update requirements and requires their layer
makeApp({ ...inferredRest, update: inferredUpdate })
makeApp({ ...inferredRest, update: inferredUpdate, resources: clock2Layer })

makeApp<Model, Message, Pages, KitMessage, Clock2, { 'wseffect:mine': any }>({
  ...configWithoutResources,
  resources: clock2Layer,
  // @ts-expect-error the framework-owned wseffect: namespace is reserved
  subscriptions: { 'wseffect:mine': undefined },
})
