import { Option, Schema } from 'effect'
import '@wsagency/wseffect-themes/css/checkbox.css'
import '@wsagency/wseffect-themes/css/checkbox-group.css'
import '@wsagency/wseffect-themes/css/checkbox-cards.css'
import '@wsagency/wseffect-themes/css/radio.css'
import '@wsagency/wseffect-themes/css/radio-group.css'
import '@wsagency/wseffect-themes/css/radio-cards.css'
import '@wsagency/wseffect-themes/css/switch.css'
import '@wsagency/wseffect-themes/css/text-area.css'
import '@wsagency/wseffect-themes/css/segmented-control.css'
import type { HtmlBuilder } from 'foldkit/html'
import * as Checkbox from '@wsagency/wseffect-themes/components/checkbox'
import * as CheckboxGroup from '@wsagency/wseffect-themes/components/checkbox-group'
import * as CheckboxCards from '@wsagency/wseffect-themes/components/checkbox-cards'
import * as Radio from '@wsagency/wseffect-themes/components/radio'
import * as RadioGroup from '@wsagency/wseffect-themes/components/radio-group'
import * as RadioCards from '@wsagency/wseffect-themes/components/radio-cards'
import * as Switch from '@wsagency/wseffect-themes/components/switch'
import * as TextArea from '@wsagency/wseffect-themes/components/text-area'
import * as SegmentedControl from '@wsagency/wseffect-themes/components/segmented-control'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'
import { defineMessageUnion } from 'foldkit/message'
const Message = defineMessageUnion({ ToggleCheckbox: { checked: Schema.Boolean }, ToggleSwitch: { enabled: Schema.Boolean } })
type Message = typeof Message.Type
const frequencyGroup = RadioGroup.create<string>()
const billingGroup = RadioCards.create<string>()
const segmented = SegmentedControl.create<string>()
const draw = (h: HtmlBuilder<Message>, name: string, props: Record<string, unknown> = {}) => {
  if (name === 'Checkbox') return Checkbox.view<Message>({ id: 'forms-extra-checkbox', checked: true, ariaLabel: 'Enable notifications', onCheckedChange: (checked: boolean) => Message.ToggleCheckbox({ checked }), ...props } as Omit<Checkbox.Props, 'onCheckedChange'> & { onCheckedChange: (checked: boolean) => Message }, [], h)
  if (name === 'Switch') return Switch.view<Message>({ id: 'forms-extra-switch', checked: true, ariaLabel: 'Airplane mode', ...props } as Switch.Props & { onCheckedChange?: (checked: boolean) => Message }, [], h)
  if (name === 'CheckboxGroup') return CheckboxGroup.view<string, Message>({ id: 'forms-extra-group', ariaLabel: 'Notifications', options: [{ value: 'updates', label: h.span([], ['Product updates']) }, { value: 'news', label: h.span([], ['Company news']) }], selected: new Set(['updates']), toggleMessage: (_value, checked) => Message.ToggleCheckbox({ checked }), variant: 'soft', ...props } as Parameters<typeof CheckboxGroup.view<string, Message>>[0], h)
  if (name === 'CheckboxCards') return CheckboxCards.view<string, Message>({ id: 'forms-extra-cards', ariaLabel: 'Plans', options: [{ value: 'standard', label: ['Standard plan'] }, { value: 'premium', label: ['Premium plan'] }], selected: new Set(['standard']), toggleMessage: (_value, checked) => Message.ToggleCheckbox({ checked }), variant: 'classic', ...props } as Parameters<typeof CheckboxCards.view<string, Message>>[0], h)
  if (name === 'Radio') return Radio.view<Message>({ id: 'forms-extra-radio', value: 'daily', checked: true, ...props } as Radio.Props & { onValueChange?: (value: string) => Message }, ['Daily'], h)
  const groupInputs = { options: [{ value: 'daily', label: h.span([], ['Daily']) }, { value: 'weekly', label: h.span([], ['Weekly']) }], selectedValue: Option.some('daily'), ariaLabel: 'Frequency', orientation: 'Horizontal' as const, props: { variant: 'surface', ...props } } as Parameters<typeof frequencyGroup.view>[1]
  if (name === 'RadioGroup') return frequencyGroup.view(frequencyGroup.init({ id: 'gallery-frequency' }), groupInputs, h as unknown as HtmlBuilder<typeof frequencyGroup.Message.Type>)
  if (name === 'RadioCards') return billingGroup.view(billingGroup.init({ id: 'gallery-billing' }), { options: [{ value: 'monthly', label: h.span([], ['Monthly']) }, { value: 'yearly', label: h.span([], ['Yearly']) }], selectedValue: Option.some('monthly'), ariaLabel: 'Billing', orientation: 'Horizontal', props: { variant: 'surface', ...props } } as Parameters<typeof billingGroup.view>[1], h as unknown as HtmlBuilder<typeof billingGroup.Message.Type>)
  if (name === 'TextArea') return TextArea.view<Message>({ id: 'forms-extra-textarea', value: 'Radix2Solid sample', textareaAttributes: [h.AriaLabel('Description')], ...props } as TextArea.ViewProps<Message>, [], h)
  if (name === 'SegmentedControl') return segmented.view(segmented.init({ id: 'gallery-view' }), { options: [{ value: 'day', label: h.span([], ['Day']) }, { value: 'week', label: h.span([], ['Week']) }], selectedValue: Option.some('day'), ariaLabel: 'View mode', orientation: 'Horizontal', props: { variant: 'surface', ...props } } as Parameters<typeof segmented.view>[1], h as unknown as HtmlBuilder<typeof segmented.Message.Type>)
  return null
}

export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  renderCaptureView(root, request, h => draw(h as unknown as HtmlBuilder<Message>, request.component, request.props))
}

