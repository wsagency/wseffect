import { Schema } from 'effect'
import { Command, Mount, Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  breakpointSubscription, clipboardCommand, makeLocale, resizeObserverMount, scrollIntoViewCommand,
  type Breakpoint, type BrowserCommandResult, type ResizeResult,
} from '@wsagency/wseffect-app'
import { Button, Card, Flex, Heading, Text } from '@wsagency/wseffect-themes'
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
export const Model = Schema.Struct({ breakpoint: BreakpointSchema, localeNumber: Schema.String, clipboard: Schema.String, scroll: Schema.String, resize: Schema.String })
export const Message = defineMessageUnion({
  BreakpointChanged: { value: BreakpointSchema },
  Copy: {}, Scroll: {},
  ClipboardFinished: { result: BrowserResultSchema },
  ScrollFinished: { result: BrowserResultSchema },
  ResizeReported: { result: ResizeResultSchema },
})
type Model = typeof Model.Type
type Message = typeof Message.Type

const breakpointMount: Mount.MountAction<Message> = {
  name: 'GalleryCapabilityBreakpoint',
  f: () => breakpointSubscription<Message>((value: Breakpoint) => Message.BreakpointChanged({ value }))['wseffect:breakpoint'].dependenciesToStream({}),
}
const resizeMount = () => resizeObserverMount<Message>((result: ResizeResult) => Message.ResizeReported({ result }))
const copy = (): Command.Command<Message, never> => clipboardCommand('Gallery capability clipboard', (result: BrowserCommandResult) => Message.ClipboardFinished({ result }))
const scroll = (): Command.Command<Message, never> => scrollIntoViewCommand('scroll-target', { behavior: 'instant', block: 'center' }, (result: BrowserCommandResult) => Message.ScrollFinished({ result }))

export const page = galleryPageContract.definePage({
  Model,
  Message,
  init: () => ({ model: { breakpoint: 'initial' as const, localeNumber: makeLocale('de-DE').number(1234.5), clipboard: 'Not copied', scroll: 'Ready', resize: 'Waiting for size' } }),
  update: (model: Model, message: Message) => Message.match(message, {
    BreakpointChanged: ({ value }) => ({ model: { ...model, breakpoint: value } }),
    Copy: () => ({ model, commands: [copy()] }),
    Scroll: () => ({ model, commands: [scroll()] }),
    ClipboardFinished: ({ result }) => ({ model: { ...model, clipboard: result._tag === 'Succeeded' ? 'Copied' : `Clipboard failed: ${result.reason}` } }),
    ScrollFinished: ({ result }) => ({ model: { ...model, scroll: result._tag === 'Succeeded' ? 'Scrolled to target' : `Scroll failed: ${result.reason}` } }),
    ResizeReported: ({ result }) => ({ model: { ...model, resize: result._tag === 'Resized' ? `${result.width} × ${result.height}` : result._tag } }),
  }),
  view: Submodel.defineView<Model, Message, PageInputs>((model, _inputs, h) => h.div([h.OnMount(breakpointMount), h.Class('capability-stack')], [
    Heading.view({ as: 'h1' }, ['Browser capabilities'], h),
    Card.view({ size: '2', variant: 'classic' }, [
      h.div([h.Id('capability-breakpoint')], [
        Flex.view({ direction: 'column', align: 'start', gap: '2' }, [
          Heading.view({ as: 'h2', size: '3' }, ['Breakpoint'], h),
          Text.view({ as: 'p' }, ['Current breakpoint: ', h.span([h.Id('breakpoint-value'), h.Class('rt-r-weight-bold')], [model.breakpoint])], h),
        ], h),
      ]),
    ], h),
    Card.view({ size: '2', variant: 'classic' }, [
      h.div([h.Id('capability-locale')], [
        Flex.view({ direction: 'column', align: 'start', gap: '2' }, [
          Heading.view({ as: 'h2', size: '3' }, ['Locale'], h),
          Text.view({ as: 'p' }, ['German number: ', h.span([h.Id('locale-number'), h.Class('rt-r-weight-bold')], [model.localeNumber])], h),
        ], h),
      ]),
    ], h),
    Card.view({ size: '2', variant: 'classic' }, [
      h.div([h.Id('capability-clipboard')], [
        Flex.view({ direction: 'column', align: 'start', gap: '2' }, [
          Heading.view({ as: 'h2', size: '3' }, ['Clipboard'], h),
          Button.view({ type: 'button', onClick: Message.Copy() }, ['Copy capability text'], h),
          h.div([h.Id('clipboard-status'), h.AriaLive('polite')], [
            Text.view({ as: 'p', color: model.clipboard === 'Copied' ? 'green' : model.clipboard.startsWith('Clipboard failed:') ? 'red' : 'gray' }, [model.clipboard], h),
          ]),
        ], h),
      ]),
    ], h),
    Card.view({ size: '2', variant: 'classic' }, [
      h.div([h.Id('capability-scroll')], [
        Flex.view({ direction: 'column', align: 'start', gap: '2' }, [
          Heading.view({ as: 'h2', size: '3' }, ['Scroll'], h),
          Button.view({ type: 'button', variant: 'soft', onClick: Message.Scroll() }, ['Scroll to target'], h),
          h.div([h.Id('scroll-status'), h.AriaLive('polite')], [
            Text.view({ as: 'p', color: model.scroll === 'Scrolled to target' ? 'green' : model.scroll.startsWith('Scroll failed:') ? 'red' : 'gray' }, [model.scroll], h),
          ]),
          h.div([h.Id('scroll-target')], [Text.view({ as: 'p', weight: 'medium' }, ['Scroll target'], h)]),
        ], h),
      ]),
    ], h),
    Card.view({ size: '2', variant: 'classic' }, [
      h.div([h.Id('capability-resize')], [
        Flex.view({ direction: 'column', align: 'start', gap: '2' }, [
          Heading.view({ as: 'h2', size: '3' }, ['Resize'], h),
          h.div([h.Id('resize-box'), h.OnMount(resizeMount()), h.Class('capability-resize-box')], ['Resize this owned element']),
          h.div([h.Id('resize-value'), h.AriaLive('polite')], [
            Text.view({ as: 'p', color: model.resize === 'Waiting for size' ? 'gray' : model.resize.startsWith('Resize') ? 'red' : 'green' }, [model.resize], h),
          ]),
        ], h),
      ]),
    ], h),
  ])),
})
