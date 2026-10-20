import { Effect, Option, Schema } from 'effect'
import { Command } from 'foldkit'
import * as Mount from 'foldkit/mount'
import * as Navigation from 'foldkit/navigation'
import { defineTaggedUnion } from 'foldkit/schema'
import type { HtmlBuilder } from 'foldkit/html'
import type { Url } from 'foldkit/url'
import type { UrlRequest } from 'foldkit/navigation'
import * as Theme from '@wsagency/wseffect-themes/components/theme'
import { Box, Flex, Heading, Text } from '@wsagency/wseffect-themes'
import { PageOutMessage } from './contract.js'
import type { PageInputs, PageOutMessage as PageOutMessageType } from './contract.js'
import * as DatePicker from './datePicker.js'
import { pageKeysByRoute, pageKeysForRoute } from './routes.js'
import { BUILD_ID, initKit, kitStateSchema, prefetchOnVisible } from '@wsagency/wseffect-app'
import { KitMessage, kit, pages } from './pages.gen.js'
import type { Pages } from './pages.gen.js'

export const Model = Schema.Struct({
  date: Schema.String,
  datePicker: DatePicker.Model,
  theme: Theme.Settings,
  kit: kitStateSchema(pages),
})
export type Model = typeof Model.Type

export const Message = defineTaggedUnion({
  ChangedDate: { date: Schema.String },
  ChangedUrl: { path: Schema.String },
  RequestedUrl: { path: Schema.String },
  UrlPushed: {},
  PageOutMessage: { message: PageOutMessage },
  GotDatePickerMessage: { message: DatePicker.Message },
  GotKitMessage: { message: KitMessage },
})
export type Message = typeof Message.Type
export type KitMessageType = typeof KitMessage.Type & { readonly _tag: string }

const PushUrl = Command.define('PushUrl', {
  args: { path: Schema.String },
  messages: [Message.UrlPushed],
  execute: ({ path }) => Effect.as(Navigation.pushUrl(path), Message.UrlPushed()),
})

const shiftDate = (date: string, days: number): string => {
  const timestamp = Date.parse(`${date}T00:00:00.000Z`)
  return Number.isNaN(timestamp) ? date : new Date(timestamp + days * 86_400_000).toISOString().slice(0, 10)
}

const updateThemeSetting = (model: Model, setting: string, value: string): Model => {
  switch (setting) {
    case 'accentColor': {
      const decoded = Schema.decodeUnknownOption(Theme.Settings.fields.accentColor)(value)
      return Option.isSome(decoded) ? { ...model, theme: { ...model.theme, accentColor: decoded.value } } : model
    }
    case 'grayColor': {
      const decoded = Schema.decodeUnknownOption(Theme.Settings.fields.grayColor)(value)
      return Option.isSome(decoded) ? { ...model, theme: { ...model.theme, grayColor: decoded.value } } : model
    }
    case 'radius': {
      const decoded = Schema.decodeUnknownOption(Theme.Settings.fields.radius)(value)
      return Option.isSome(decoded) ? { ...model, theme: { ...model.theme, radius: decoded.value } } : model
    }
    case 'scaling': {
      const decoded = Schema.decodeUnknownOption(Theme.Settings.fields.scaling)(value)
      return Option.isSome(decoded) ? { ...model, theme: { ...model.theme, scaling: decoded.value } } : model
    }
    case 'appearance': {
      const decoded = Schema.decodeUnknownOption(Theme.Settings.fields.appearance)(value)
      return Option.isSome(decoded) ? { ...model, theme: { ...model.theme, appearance: decoded.value } } : model
    }
    case 'panelBackground': {
      const decoded = Schema.decodeUnknownOption(Theme.Settings.fields.panelBackground)(value)
      return Option.isSome(decoded) ? { ...model, theme: { ...model.theme, panelBackground: decoded.value } } : model
    }
    default: return model
  }
}

export const applyPageOutMessage = (model: Model, message: PageOutMessageType): Model =>
  PageOutMessage.match(message, {
    RequestedShiftDay: ({ days }) => ({ ...model, date: shiftDate(model.date, days) }),
    ChangedThemeSetting: ({ setting, value }) => updateThemeSetting(model, setting, value),
  })

export function createInitialModel(activeKeys: ReadonlyArray<keyof Pages & string> = []): Model {
  return {
    date: '2026-10-19',
    datePicker: {},
    theme: Theme.defaults,
    kit: initKit(pages, activeKeys),
  }
}

const routeUpdate = (model: Model, path: string) => {
  const result = kit.update(model.kit, KitMessage.EnteredRoute({ keys: pageKeysForRoute(path) }))
  return {
    model: { ...model, kit: result.model },
    commands: result.commands?.map((command) => Command.mapMessage(command, (message) => Message.GotKitMessage({ message }))) ?? [],
  }
}

const applyKitMessage = (model: Model, message: typeof KitMessage.Type) => {
  const result = kit.update(model.kit, message)
  const next = { ...model, kit: result.model }
  const withOutMessage = result.outMessage === undefined ? next : applyPageOutMessage(next, result.outMessage)
  return {
    model: withOutMessage,
    commands: result.commands?.map((command) => Command.mapMessage(command, (message) => Message.GotKitMessage({ message }))) ?? [],
  }
}

export const update = (model: Model, message: Message) => Message.match(message, {
  ChangedDate: ({ date }) => ({ model: { ...model, date } }),
  ChangedUrl: ({ path }) => routeUpdate(model, path),
  RequestedUrl: ({ path }) => ({ model, commands: [PushUrl({ path })] }),
  UrlPushed: () => ({ model }),
  PageOutMessage: ({ message: outMessage }) => ({ model: applyPageOutMessage(model, outMessage) }),
  GotDatePickerMessage: ({ message: childMessage }) => DatePicker.Message.match(childMessage, {
    ChangedDate: ({ date }) => ({ model: { ...model, date } }),
    ShiftDate: ({ days }) => ({ model: { ...model, date: shiftDate(model.date, days) } }),
  }),
  GotKitMessage: ({ message: kitMessage }) => applyKitMessage(model, kitMessage),
})

const pageInputs = (model: Model): PageInputs => ({
  date: model.date,
  accentColor: model.theme.accentColor,
  grayColor: model.theme.grayColor,
  radius: model.theme.radius,
  scaling: model.theme.scaling,
  appearance: model.theme.appearance,
  panelBackground: model.theme.panelBackground,
})


export const view = (model: Model, h: HtmlBuilder<Message>) => {
  const routeLinks = Object.entries(pageKeysByRoute).flatMap(([path, keys]) => {
    if (path === '/') return []
    const key = keys[0]!
    const prefetch = Message.GotKitMessage({ message: kit.messages.requestedPrefetch(key) })
    const visiblePrefetches = keys.map((pageKey) => {
      const attribute = prefetchOnVisible<Pages, KitMessage>(kit, pageKey)
      if (attribute._tag !== 'OnMount') throw new Error('Expected an OnMount attribute')
      return h.OnMount(Mount.mapMessage(attribute.action, (message) => Message.GotKitMessage({ message })))
    })
    const isActive = keys.some((pageKey) => model.kit.activeKeys.includes(pageKey))
    return [h.a([
      h.Id(path === '/shared' ? 'link-shared' : `link-${key}`),
      h.Href(path),
      ...(path === '/menus' ? [h.DataAttribute('perf', 'nav-cold')] : []),
      ...(path === '/dialog' ? [h.DataAttribute('perf', 'nav-prefetch')] : []),
      h.Class('rt-reset rt-BaseButton rt-r-size-1 rt-variant-outline rt-Button gallery-route-link'),
      ...(isActive ? [h.DataAttribute('active', '')] : []),
      h.OnMouseEnter(prefetch),
      h.OnFocus(prefetch),
      ...visiblePrefetches,
    ], [path.slice(1)])]
  })
  const activePages = model.kit.activeKeys.map((key) => h.submodel({
    slotId: `page-${key}`,
    model: model.kit,
    view: kit.view,
    viewInputs: { key, inputs: pageInputs(model) },
    toParentMessage: (message) => Message.GotKitMessage({ message }),
  }))

  return {
    title: 'WS Effect Gallery',
    body: Theme.view(
      { settings: model.theme, isRoot: true },
      [
        h.div([h.Class('gallery-shell')], [
          h.header([h.Class('gallery-topbar')], [
            Flex.view({ align: 'center', justify: 'between', wrap: 'wrap', gap: '3' }, [
              Heading.view({ as: 'h1', size: '4', weight: 'medium' }, ['WS Effect Gallery'], h),
              Flex.view({ align: 'center', wrap: 'wrap', gap: '3' }, [
                h.output([h.Id('date-shell')], [Text.view({ as: 'span', size: '2' }, [model.date], h)]),
                h.submodel({
                  slotId: 'date-picker',
                  model: model.datePicker,
                  view: DatePicker.view,
                  viewInputs: { date: model.date },
                  toParentMessage: (message) => Message.GotDatePickerMessage({ message }),
                }),
                h.output([h.Id('build-id'), h.Class('gallery-build-id')], [
                  Text.view({ as: 'span', size: '1' }, [BUILD_ID], h),
                ]),
              ], h),
            ], h),
          ]),
          h.nav([h.AriaLabel('Gallery pages'), h.Class('gallery-route-nav')], [
            h.div([h.Id('gallery-page-links')], [Flex.view({ wrap: 'nowrap', gap: '2' }, routeLinks, h)]),
          ]),
          h.main([h.Class('gallery-page-content')], activePages.length > 0
            ? [Box.view({ p: '4' }, activePages, h)]
            : []),
          h.footer([], [kit.bannerView
            ? h.submodel({ slotId: 'pwa-banner', model: model.kit, view: kit.bannerView, toParentMessage: (message) => Message.GotKitMessage({ message }) })
            : null]),
        ]),
      ],
      h,
    ),
  }
}

export const onUrlRequest = (request: UrlRequest): Message => request._tag === 'Internal'
  ? Message.RequestedUrl({ path: request.url.pathname })
  : Message.ChangedUrl({ path: typeof location === 'undefined' ? '/' : location.pathname })

export const onUrlChange = (url: Url): Message => Message.ChangedUrl({ path: url.pathname })

export const init = (url: Url) => routeUpdate(createInitialModel(), url.pathname)
