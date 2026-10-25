import { Option } from 'effect'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { Submodel } from '@wsagency/wseffect-foldkit'
import { createLazy } from '@wsagency/wseffect-foldkit/html'
import type { AnyPage, InputsOf, MessageOf, ModelOf } from '../contract.js'
import type { PagesHandle } from '../registry.js'
import type { PageSlot } from '../slots.js'
import type { KitState } from '../kit/state.js'

export type KitPageViewInputs<Pages extends Record<string, AnyPage>> = Readonly<{
  key: keyof Pages & string
  inputs: InputsOf<Pages[keyof Pages]>
}>

export interface PageViewMessages<Pages extends Record<string, AnyPage>, KitMessage> {
  readonly clickedRetryPage: (key: keyof Pages & string) => KitMessage
  readonly clickedReloadPage: (key: keyof Pages & string) => KitMessage
}

interface PageViewContext<Pages extends Record<string, AnyPage>, Key extends keyof Pages & string, KitMessage> {
  key: Key
  inputs: InputsOf<Pages[Key]>
  toParentMessage: (message: MessageOf<Pages[Key]>) => KitMessage
  h: HtmlBuilder<KitMessage>
  renderPage: Pages[Key]['view']
}

function renderSubmodel<Pages extends Record<string, AnyPage>, Key extends keyof Pages & string, KitMessage>(
  model: ModelOf<Pages[Key]>,
  context: PageViewContext<Pages, Key, KitMessage>,
  ..._memoizedInputs: unknown[]
) {
  return context.h.submodel({
    slotId: `page-${context.key}`,
    model,
    view: context.renderPage,
    viewInputs: context.inputs,
    toParentMessage: context.toParentMessage,
  } as never)
}

function readyView<Pages extends Record<string, AnyPage>, Key extends keyof Pages & string, KitMessage>(
  key: Key,
  page: Pages[Key],
  slot: PageSlot<ModelOf<Pages[Key]>>,
  inputs: InputsOf<Pages[Key]>,
  toParentMessage: (message: MessageOf<Pages[Key]>) => KitMessage,
  h: HtmlBuilder<KitMessage>,
  lazy: ReturnType<typeof createLazy>,
  contexts: Map<Key, PageViewContext<Pages, Key, KitMessage>>,
) {
  if (slot._tag !== 'Ready') return null
  const primitiveInputs = inputs === undefined
    ? []
    : Object.entries(inputs).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([, value]) => value)
  let context = contexts.get(key)
  if (context === undefined) {
    context = { key, inputs, toParentMessage, h, renderPage: page.view }
    contexts.set(key, context)
  } else {
    context.inputs = inputs
    context.toParentMessage = toParentMessage
    context.h = h
  }
  const args: [ModelOf<Pages[Key]>, PageViewContext<Pages, Key, KitMessage>, ...unknown[]] = [slot.model, context, ...primitiveInputs, h]
  return lazy(renderSubmodel, args)
}

export function viewPage<Pages extends Record<string, AnyPage>, KitMessage extends object>(config: {
  readonly pages: PagesHandle<Pages>
  readonly toParentMessage: { readonly [Key in keyof Pages]: (message: MessageOf<Pages[Key]>) => KitMessage }
  readonly messages: PageViewMessages<Pages, KitMessage>
}): Submodel.View<KitState<Pages>, KitMessage, KitPageViewInputs<Pages>> {
  const lazyViews = new Map<keyof Pages & string, ReturnType<typeof createLazy>>(
    config.pages.keys.map((key) => [key, createLazy()]),
  )
  const contexts = new Map<keyof Pages & string, PageViewContext<Pages, keyof Pages & string, KitMessage>>()
  return Submodel.defineView<KitState<Pages>, KitMessage, KitPageViewInputs<Pages>>((state, viewInputs, h) => {
    const { key, inputs } = viewInputs
    const slot = state.slots[key]
    if (slot._tag === 'Loading' || slot._tag === 'Dehydrated') {
      return h.div([h.Id(`loading-${key}`), h.Role('status'), h.AriaLive('polite')], ['Loading page'])
    }
    if (slot._tag === 'Failed') {
      const isNewVersion = slot.cause === 'NewVersion'
      return h.div([h.Id(`failed-${key}`), h.Attribute('data-cause', slot.cause), h.Role('alert')], [
        h.p([], [slot.reason]),
        h.button([
          h.Id(`${isNewVersion ? 'reload' : 'retry'}-${key}`),
          h.OnClick(isNewVersion ? config.messages.clickedReloadPage(key) : config.messages.clickedRetryPage(key)),
        ], [isNewVersion ? 'Reload' : 'Retry']),
      ])
    }
    if (slot._tag !== 'Ready') return null
    const page = Option.getOrUndefined(config.pages.registry.get(key))
    const lazy = lazyViews.get(key)
    if (page === undefined || lazy === undefined) return null
    return readyView(key, page, slot, inputs, config.toParentMessage[key], h, lazy, contexts)
  })
}
