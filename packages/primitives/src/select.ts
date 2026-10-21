import * as Option from 'effect/Option'
import * as Listbox from '@foldkit/ui/listbox'
import type { Html, HtmlBuilder } from 'foldkit/html'

export type SelectItem<Value extends string> = {
  value: Value
  textValue: string
  isDisabled: boolean
  content: Html
}
export type SelectGroup<Value extends string> = {
  id: string
  label: Html
  items: ReadonlyArray<SelectItem<Value> | SelectSeparator>
}
export type SelectSeparator = { kind: 'separator'; id: string }
export type SelectConfig<Value extends string> = {
  id: string
  selectedValue: Option.Option<Value>
  items: ReadonlyArray<SelectItem<Value> | SelectGroup<Value> | SelectSeparator>
  position: 'popper' | 'item-aligned'
  isModal: false
}
export type SelectModel = Listbox.Model
export type SelectMessage = Listbox.Message
export type SelectOutMessage<Value extends string> = Listbox.OutMessage<Value>
type UpstreamBundle<Value extends string> = Listbox.Bundle<SelectItem<Value>, Value>
export type SelectBundle<Value extends string> = Pick<
  UpstreamBundle<Value>,
  'update' | 'selectItem' | 'open' | 'close'
> & {
  init(config: SelectConfig<Value>): SelectModel
  view(model: SelectModel, config: SelectConfig<Value>, h: HtmlBuilder<SelectMessage>): Html
}

export declare function createSelect<Value extends string>(): SelectBundle<Value>
