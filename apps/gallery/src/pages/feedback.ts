import { Schema } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import { Submodel } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as Badge from '@wsagency/wseffect-themes/components/badge'
import * as Callout from '@wsagency/wseffect-themes/components/callout'
import * as Progress from '@wsagency/wseffect-themes/components/progress'
import * as Separator from '@wsagency/wseffect-themes/components/separator'
import * as Skeleton from '@wsagency/wseffect-themes/components/skeleton'
import * as Spinner from '@wsagency/wseffect-themes/components/spinner'
import * as Heading from '@wsagency/wseffect-themes/components/heading'
import { galleryPageContract, type PageInputs } from '../contract.js'
export const Model = Schema.Struct({}); export const Message = defineMessageUnion({ Tick: {} }); type Model = typeof Model.Type; type Message = typeof Message.Type
const draw = <M>(h: HtmlBuilder<M>, name: string, props: Record<string, unknown> = {}) => {
  if (name === 'Badge') return Badge.view(props as Badge.ViewProps, ['New'], h)
  if (name === 'Callout') return Callout.Root.view(props as Callout.RootProps, [Callout.Text.view({}, ['Profile updated'], h)], h)
  if (name === 'Progress') return Progress.view(props as Progress.ViewProps, [], h)
  if (name === 'Separator') return Separator.view(props as Separator.ViewProps, [], h)
  if (name === 'Skeleton') return Skeleton.view(props as Skeleton.ViewProps, [], h)
  return Spinner.view(props as Spinner.ViewProps, [], h)
}
export const page = galleryPageContract.definePage({ Model, Message, init: () => ({ model: {} }), update: (model: Model, message: Message) => Message.match(message, { Tick: () => ({ model }) }), view: Submodel.defineView<Model, Message, PageInputs>((_m, _i, h) => h.div([], [Heading.view({ as: 'h1' }, ['Feedback'], h), draw(h, 'Badge'), draw(h, 'Badge', { variant: 'outline' }), draw(h, 'Callout'), draw(h, 'Progress', { ariaLabel: 'Loading progress' }), draw(h, 'Progress', { variant: 'classic', value: 64, max: 100, ariaLabel: 'Upload progress' }), draw(h, 'Separator'), draw(h, 'Skeleton'), draw(h, 'Spinner')])) })
