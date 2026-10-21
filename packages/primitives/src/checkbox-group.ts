import type { Html, HtmlBuilder } from 'foldkit/html'

export type Option<Value extends string> = { value: Value; label: Html; isDisabled: boolean }
export type Props<Value extends string, Message> = {
  id: string
  label: Html
  options: ReadonlyArray<Option<Value>>
  selected: ReadonlySet<Value>
  isDisabled?: boolean
  toggleMessage(value: Value, isChecked: boolean): Message
}

export const view = <Value extends string, Message>(props: Props<Value, Message>, h: HtmlBuilder<Message>): Html =>
  h.div([], [
    h.span([], [props.label]),
    ...props.options.map((option) => h.label([], [
      h.input([
        h.Checked(props.selected.has(option.value)),
        h.Disabled(props.isDisabled === true || option.isDisabled),
        h.OnChange((_value) => props.toggleMessage(option.value, !props.selected.has(option.value))),
      ]),
      option.label,
    ])),
  ])
