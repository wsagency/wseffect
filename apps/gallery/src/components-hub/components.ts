import { Effect, Schema } from 'effect'
import { Command, Mount, Submodel } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineTaggedUnion } from 'foldkit/schema'
import { bindKit, ensure, initKit, kitMessageFields, kitStateSchema, makePages } from '@wsagency/wseffect-app'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, type PageInputs } from '../contract.js'

type FamilyPages = {
  accessibility: typeof import('../components/accessibility.js').page
  alertDialog: typeof import('../components/alertDialog.js').page
  avatar: typeof import('../components/avatar.js').page
  contextMenu: typeof import('../components/contextMenu.js').page
  data: typeof import('../components/data.js').page
  dataTable: typeof import('../components/dataTable.js').page
  feedback: typeof import('../components/feedback.js').page
  hoverCard: typeof import('../components/hoverCard.js').page
  iconButton: typeof import('../components/iconButton.js').page
  layoutExtra: typeof import('../components/layoutExtra.js').page
  links: typeof import('../components/links.js').page
  popover: typeof import('../components/popover.js').page
  scrollArea: typeof import('../components/scrollArea.js').page
  tabNav: typeof import('../components/tabNav.js').page
  themePanel: typeof import('../components/themePanel.js').page
  tooltip: typeof import('../components/tooltip.js').page
  typographyExtra: typeof import('../components/typographyExtra.js').page
}

const familyPages = makePages<FamilyPages>({
  accessibility: () => import('../components/accessibility.js').then((module) => module.page),
  alertDialog: () => import('../components/alertDialog.js').then((module) => module.page),
  avatar: () => import('../components/avatar.js').then((module) => module.page),
  contextMenu: () => import('../components/contextMenu.js').then((module) => module.page),
  data: () => import('../components/data.js').then((module) => module.page),
  dataTable: () => import('../components/dataTable.js').then((module) => module.page),
  feedback: () => import('../components/feedback.js').then((module) => module.page),
  hoverCard: () => import('../components/hoverCard.js').then((module) => module.page),
  iconButton: () => import('../components/iconButton.js').then((module) => module.page),
  layoutExtra: () => import('../components/layoutExtra.js').then((module) => module.page),
  links: () => import('../components/links.js').then((module) => module.page),
  popover: () => import('../components/popover.js').then((module) => module.page),
  scrollArea: () => import('../components/scrollArea.js').then((module) => module.page),
  tabNav: () => import('../components/tabNav.js').then((module) => module.page),
  themePanel: () => import('../components/themePanel.js').then((module) => module.page),
  tooltip: () => import('../components/tooltip.js').then((module) => module.page),
  typographyExtra: () => import('../components/typographyExtra.js').then((module) => module.page),
})
const FamilyKeySchema = Schema.Literals([
  'accessibility', 'alertDialog', 'avatar', 'contextMenu', 'data', 'dataTable', 'feedback',
  'hoverCard', 'iconButton', 'layoutExtra', 'links', 'popover', 'scrollArea', 'tabNav',
  'themePanel', 'tooltip', 'typographyExtra',
])

const FamilyMessage = defineTaggedUnion({ ...kitMessageFields(familyPages) })
const familyPageMessageTags = {
  accessibility: 'GotAccessibilityPageMessage',
  alertDialog: 'GotAlertDialogPageMessage',
  avatar: 'GotAvatarPageMessage',
  contextMenu: 'GotContextMenuPageMessage',
  data: 'GotDataPageMessage',
  dataTable: 'GotDataTablePageMessage',
  feedback: 'GotFeedbackPageMessage',
  hoverCard: 'GotHoverCardPageMessage',
  iconButton: 'GotIconButtonPageMessage',
  layoutExtra: 'GotLayoutExtraPageMessage',
  links: 'GotLinksPageMessage',
  popover: 'GotPopoverPageMessage',
  scrollArea: 'GotScrollAreaPageMessage',
  tabNav: 'GotTabNavPageMessage',
  themePanel: 'GotThemePanelPageMessage',
  tooltip: 'GotTooltipPageMessage',
  typographyExtra: 'GotTypographyExtraPageMessage',
} as const
const familyKit = bindKit({ pages: familyPages, KitMessage: FamilyMessage, pageMessageTags: familyPageMessageTags })

type FamilyKey = keyof FamilyPages
const familyRoutes = [
  { key: 'accessibility', path: '/components/accessibility', label: 'Accessibility' },
  { key: 'alertDialog', path: '/components/alert-dialog', label: 'Alert dialog' },
  { key: 'avatar', path: '/components/avatar', label: 'Avatar' },
  { key: 'contextMenu', path: '/components/context-menu', label: 'Context menu' },
  { key: 'data', path: '/components/data', label: 'Data' },
  { key: 'dataTable', path: '/components/data-table', label: 'Data table' },
  { key: 'feedback', path: '/components/feedback', label: 'Feedback' },
  { key: 'hoverCard', path: '/components/hover-card', label: 'Hover card' },
  { key: 'iconButton', path: '/components/icon-button', label: 'Icon button' },
  { key: 'layoutExtra', path: '/components/layout-extra', label: 'Layout extras' },
  { key: 'links', path: '/components/links', label: 'Links' },
  { key: 'popover', path: '/components/popover', label: 'Popover' },
  { key: 'scrollArea', path: '/components/scroll-area', label: 'Scroll area' },
  { key: 'tabNav', path: '/components/tab-nav', label: 'Tab navigation' },
  { key: 'themePanel', path: '/components/theme-panel', label: 'Theme panel' },
  { key: 'tooltip', path: '/components/tooltip', label: 'Tooltip' },
  { key: 'typographyExtra', path: '/components/typography-extra', label: 'Typography extras' },
] as const satisfies ReadonlyArray<{ readonly key: FamilyKey; readonly path: string; readonly label: string }>
const familyByPath = new Map<string, FamilyKey>(familyRoutes.map(({ key, path }) => [path, key]))
const familyForPath = (path: string): FamilyKey | undefined =>
  familyByPath.get(path.length > 1 ? path.replace(/\/+$/, '') : path)

export const Model = Schema.Struct({ familyKit: kitStateSchema(familyPages) })
export const Message = defineTaggedUnion({
  RouteChanged: { family: Schema.NullOr(FamilyKeySchema) },
  GotFamilyMessage: { message: FamilyMessage },
})
const RouteChangedOnMount = Mount.define('GalleryComponentsRouteChanged', {
  args: { family: Schema.NullOr(FamilyKeySchema) },
  messages: [Message.RouteChanged],
  execute: ({ family }) => Effect.succeed(Message.RouteChanged({ family })),
})

const LoadFamilyModule = Command.define('LoadGalleryComponentFamily', {
  args: { key: FamilyKeySchema },
  messages: [Message.GotFamilyMessage],
  execute: ({ key }) => Effect.match(ensure(familyPages, key), {
    onSuccess: () => Message.GotFamilyMessage({ message: FamilyMessage.LoadedPageModule({ key }) }),
    onFailure: (error) => Message.GotFamilyMessage({
      message: FamilyMessage.FailedPageModule({
        key,
        cause: 'LoadError',
        reason: error.cause instanceof Error ? error.cause.message : String(error.cause),
      }),
    }),
  }),
})

const updateRoute = (model: typeof Model.Type, family: FamilyKey | null) => {
  const result = familyKit.update(model.familyKit, FamilyMessage.EnteredRoute({ keys: family === null ? [] : [family] }))
  const slot = family === null ? undefined : result.model.slots[family]
  const loadCommand = family !== null && (slot?._tag === 'Loading' || slot?._tag === 'Dehydrated')
    ? [LoadFamilyModule({ key: family })]
    : []
  return {
    model: { ...model, familyKit: result.model },
    commands: [
      ...(result.commands?.map((command) => Command.mapMessage(command, (message) => Message.GotFamilyMessage({ message }))) ?? []),
      ...loadCommand,
    ],
  }
}

const updateFamily = (model: typeof Model.Type, message: typeof FamilyMessage.Type) => {
  const result = familyKit.update(model.familyKit, message)
  return {
    model: { ...model, familyKit: result.model },
    commands: result.commands?.map((command) => Command.mapMessage(command, (childMessage) => Message.GotFamilyMessage({ message: childMessage }))) ?? [],
    ...(result.outMessage === undefined ? {} : { outMessage: result.outMessage }),
  }
}

const update = (model: typeof Model.Type, message: typeof Message.Type) => Message.match(message, {
  RouteChanged: ({ family }) => updateRoute(model, family),
  GotFamilyMessage: ({ message: childMessage }) => updateFamily(model, childMessage),
})

const familyView = (model: typeof Model.Type, family: FamilyKey | undefined, inputs: PageInputs, h: HtmlBuilder<typeof Message.Type>) => {
  if (family === undefined) return h.p([], ['Choose a component family to explore.'])
  return h.submodel({
    slotId: `component-family-${family}`,
    model: model.familyKit,
    view: familyKit.view,
    viewInputs: { key: family, inputs },
    toParentMessage: (message) => Message.GotFamilyMessage({ message }),
  })
}

const view = Submodel.defineView<typeof Model.Type, typeof Message.Type, PageInputs>((model, inputs, h) => {
  const family = familyForPath(inputs.path)
  return h.div([h.Class('gallery-components')], [
    Heading.view({ as: 'h2', size: '3', weight: 'medium' }, ['Components'], h),
    h.nav([h.AriaLabel('Component families'), h.Class('gallery-components-nav')], [
      ...familyRoutes.map(({ label, path }) => h.a([h.Href(path)], [label])),
    ]),
    h.div([h.Key(inputs.path), h.OnMount(RouteChangedOnMount({ family: family ?? null }))], [
      familyView(model, family, inputs, h),
    ]),
  ])
})

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({ model: { familyKit: initKit(familyPages, []) } }),
  update,
  view,
})
