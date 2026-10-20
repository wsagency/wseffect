import { Schema } from 'effect'
import { Command, Mount, Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  breakpointSubscription, clipboardCommand, makeLocale, resizeObserverMount, scrollIntoViewCommand,
  type Breakpoint, type BrowserCommandResult, type ResizeResult,
} from '@wsagency/wseffect-app'
import { Heading } from '@wsagency/wseffect-themes'
import { galleryPageContract, type PageInputs } from '../contract.js'

const BreakpointSchema = Schema.Literals(['initial', 'xs', 'sm', 'md', 'lg', 'xl'])
const BrowserResultSchema = Schema.Union([
  Schema.Struct({ _tag: Schema.Literal('Succeeded') }),
  Schema.Struct({ _tag: Schema.Literal('Failed'), reason: Schema.String }),
])
const ResizeResultSchema = Schema.Union([
  Schema.Struct({ _tag: Schema.Literal('Resized'), width: Schema.Number, height: Schema.Number }),
  Schema.Struct({ _tag: Schema.Literals(['ResizeUnavailable', 'ResizeFailure']), reason: Schema.optional(Schema.String) }),
])
export const Model = Schema.Struct({ breakpoint: BreakpointSchema, clipboard: Schema.String, scroll: Schema.String, resize: Schema.String })
export const Message = defineMessageUnion({
  BreakpointChanged: { value: BreakpointSchema },
  Copy: {}, Scroll: {},
  ClipboardFinished: { result: BrowserResultSchema },
  ScrollFinished: { result: BrowserResultSchema },
  ResizeReported: { result: ResizeResultSchema },
})
type Model = typeof Model.Type
type Message = typeof Message.Type

const locale = makeLocale('de-DE')
const breakpointSubscriptionSet = breakpointSubscription<Message>((value: Breakpoint) => Message.BreakpointChanged({ value }))
const breakpointMount: Mount.MountAction<Message> = {
  name: 'GalleryCapabilityBreakpoint',
  f: () => breakpointSubscriptionSet['wseffect:breakpoint'].dependenciesToStream({}),
}
const resizeMount = resizeObserverMount<Message>((result: ResizeResult) => Message.ResizeReported({ result }))
const copy = (): Command.Command<Message, never> => clipboardCommand('Gallery capability clipboard', (result: BrowserCommandResult) => Message.ClipboardFinished({ result }))
const scroll = (): Command.Command<Message, never> => scrollIntoViewCommand('scroll-target', { behavior: 'instant', block: 'center' }, (result: BrowserCommandResult) => Message.ScrollFinished({ result }))

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({ model: { breakpoint: 'initial' as const, clipboard: 'Not copied', scroll: 'Ready', resize: 'Waiting for size' } }),
  update: (model: Model, message: Message) => Message.match(message, {
    BreakpointChanged: ({ value }) => ({ model: { ...model, breakpoint: value } }),
    Copy: () => ({ model, commands: [copy()] }),
    Scroll: () => ({ model, commands: [scroll()] }),
    ClipboardFinished: ({ result }) => ({ model: { ...model, clipboard: result._tag === 'Succeeded' ? 'Copied' : `Clipboard failed: ${result.reason}` } }),
    ScrollFinished: ({ result }) => ({ model: { ...model, scroll: result._tag === 'Succeeded' ? 'Scrolled to target' : `Scroll failed: ${result.reason}` } }),
    ResizeReported: ({ result }) => ({ model: { ...model, resize: result._tag === 'Resized' ? `${result.width} × ${result.height}` : result._tag } }),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => h.div([h.OnMount(breakpointMount)], [
    Heading.view({ as: 'h1' }, ['Browser capabilities'], h),
    h.p([], ['Breakpoint: ', h.span([h.Id('breakpoint-value')], [model.breakpoint])]),
    h.p([], ['German number: ', h.span([h.Id('locale-number')], [locale.number(1234.5)])]),
    h.button([h.OnClick(Message.Copy())], ['Copy capability text']),
    h.p([h.Id('clipboard-status'), h.AriaLive('polite')], [model.clipboard]),
    h.button([h.OnClick(Message.Scroll())], ['Scroll to target']),
    h.p([h.Id('scroll-status'), h.AriaLive('polite')], [model.scroll]),
    h.div([h.Id('scroll-target')], ['Scroll target']),
    h.div([h.Id('resize-box'), h.OnMount(resizeMount), h.Class('capability-resize-box')], ['Resize this owned element']),
    h.p([h.Id('resize-value')], [model.resize]),
  ])),
})
