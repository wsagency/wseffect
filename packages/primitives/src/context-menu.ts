import { Schema } from 'effect'
import * as Menu from '@foldkit/ui/menu'
import type { Html, HtmlBuilder } from 'foldkit/html'

export type ContextMenuItem<Value extends string> = {
  value: Value
  textValue: string
  isDisabled: boolean
  content: Html
}
export type ContextMenuGroup<Value extends string> = {
  id: string
  label: Html
  items: ReadonlyArray<ContextMenuItem<Value> | ContextMenuSeparator>
}
export type ContextMenuSeparator = { kind: 'separator'; id: string }
export type ContextMenuConfig<Value extends string> = {
  id: string
  items: ReadonlyArray<ContextMenuItem<Value> | ContextMenuGroup<Value> | ContextMenuSeparator>
  longPressMs: 600
  sourceId: string
  sourceToken: string
  toItem(item: Value): Html
}
export const ContextMenuInvocationSchema = Schema.Struct({
  sourceId: Schema.String,
  sourceToken: Schema.String,
  invocation: Schema.Literals(['pointer', 'keyboard', 'touch']),
  point: Schema.optional(Schema.Struct({ x: Schema.Number, y: Schema.Number })),
})
export type ContextMenuInvocation = typeof ContextMenuInvocationSchema.Type

export const ContextMenuModelSchema = Schema.Struct({
  ...Menu.Model.fields,
  invocation: Schema.NullOr(ContextMenuInvocationSchema),
  longPressVersion: Schema.Number,
})
export type ContextMenuModel = typeof ContextMenuModelSchema.Type
export const ContextMenuMessageSchema = Schema.Union([
  Menu.Message,
  Schema.Struct({ _tag: Schema.Literal('OpenedAt'), invocation: ContextMenuInvocationSchema }),
  Schema.Struct({ _tag: Schema.Literal('LongPressExpired'), version: Schema.Number }),
  Schema.Struct({ _tag: Schema.Literal('SourceUnmounted'), token: Schema.String }),
])
export type ContextMenuMessage = typeof ContextMenuMessageSchema.Type
export type ContextMenuCommand = { _tag: 'FocusSource'; sourceId: string; sourceToken: string }
export type ContextMenuOutMessage<Value extends string> = Menu.OutMessage<Value>
type UpstreamBundle<Value extends string> = Menu.Bundle<Value>
export type ContextMenuBundle<Value extends string> = Pick<
  UpstreamBundle<Value>,
  'update' | 'selectItem' | 'open' | 'close'
> & {
  init(config: ContextMenuConfig<Value>): ContextMenuModel
  view(model: ContextMenuModel, config: ContextMenuConfig<Value>, h: HtmlBuilder<ContextMenuMessage>): Html
}

export declare function createContextMenu<Value extends string>(): ContextMenuBundle<Value>
