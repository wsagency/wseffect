import { childAttributes, type ChildAttribute, type Html, type HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Checkbox from '../checkbox/index.js'

export type Option<Value extends string> = Readonly<{
  value: Value
  label: Html
  isDisabled?: boolean
}>

export type Props<Value extends string, Message> = Readonly<{
  id: string
  label?: Html
  ariaLabel?: string
  options: ReadonlyArray<Option<Value>>
  selected: ReadonlySet<Value>
  isDisabled?: boolean
  toggleMessage: (value: Value, isChecked: boolean) => Message
  toView: (input: Readonly<{
    rootAttributes: ReadonlyArray<ChildAttribute>
    labelAttributes: ReadonlyArray<ChildAttribute>
    options: ReadonlyArray<Readonly<{
      option: Option<Value>
      checkbox: Checkbox.CheckboxAttributes<Message>
    }>>
  }>) => Html
}>

export const view = <Value extends string, Message>(
  props: Props<Value, Message>,
  h: HtmlBuilder<Message>,
): Html => {
  const rootAttributes: ReadonlyArray<ChildAttribute> = childAttributes([
    h.Id(props.id),
    h.Role('group'),
    ...(props.label === undefined ? [] : [h.AriaLabelledBy(`${props.id}-label`)]),
    ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
    ...(props.isDisabled === true ? [h.AriaDisabled(true)] : []),
  ])
  const labelAttributes: ReadonlyArray<ChildAttribute> = childAttributes([
    h.Id(`${props.id}-label`),
  ])
  const options = props.options.map(option => {
    let checkbox: Checkbox.CheckboxAttributes<Message> | undefined
    Checkbox.view({
      id: `${props.id}-${option.value}`,
      isChecked: props.selected.has(option.value),
      isDisabled: props.isDisabled === true || option.isDisabled === true,
      onToggle: isChecked => props.toggleMessage(option.value, isChecked),
      toView: attributes => {
        checkbox = attributes
        return null
      },
    }, h)
    if (checkbox === undefined) {
      throw new Error('Checkbox.view must provide attributes to its toView callback')
    }
    return { option, checkbox }
  })
  return props.toView({ rootAttributes, labelAttributes, options })
}
