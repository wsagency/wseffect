import { Option } from 'effect'
import type { Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, it } from 'vitest'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import * as RadioGroup from '../src/components/radio-group.js'
import * as CheckboxGroup from '../src/components/checkbox-group.js'
import * as CheckboxCards from '../src/components/checkbox-cards.js'
import * as RadioCards from '../src/components/radio-cards.js'
import * as SegmentedControl from '../src/components/segmented-control.js'
import * as Select from '../src/components/select.js'
import * as Slider from '../src/components/slider.js'
import * as Button from '../src/components/button.js'
import * as Listbox from '@wsagency/wseffect-foldkit-ui/listbox'
import * as Checkbox from '../src/components/checkbox.js'
import * as Radio from '../src/components/radio.js'
import * as Switch from '../src/components/switch.js'
import * as TextArea from '../src/components/text-area.js'
import * as TextField from '../src/components/text-field.js'
import * as Theme from '../src/components/theme.js'

const Group = RadioGroup.create<'one' | 'two'>()
const Messages = defineMessageUnion({ Tick: {} })
type Message = RadioGroup.Message | typeof Messages.Type
const update = (model: RadioGroup.Model, message: Message) => message._tag === 'Tick' ? { model } : Group.update(model, message)

type ParityRow = {
  name: string
  view: (model: RadioGroup.Model, h: HtmlBuilder<Message>) => Html
  rootClass: string
  itemClasses: ReadonlyArray<string>
  color?: string
}

const rows: ReadonlyArray<ParityRow> = [
  {
    // Pin radix2solid@383676172abb84b4a1d2e54a087d290437ee8848: packages/themes/src/components/radio-group.tsx:19-35.
    name: 'RadioGroup applies default size and variant to each item',
    view: (model, h) => Group.view(model, {
      options: [{ value: 'one', label: h.span([], ['One']) }, { value: 'two', label: h.span([], ['Two']) }],
      selectedValue: Option.none(),
      ariaLabel: 'Choice',
    }, h as HtmlBuilder<RadioGroup.Message>),
    rootClass: 'rt-RadioGroupRoot',
    itemClasses: ['rt-r-size-2', 'rt-variant-surface'],
  },
  {
    // Pin radix2solid@383676172abb84b4a1d2e54a087d290437ee8848: packages/themes/src/components/radio-group.tsx:19-35.
    name: 'RadioGroup maps responsive size, variant, highContrast, and color onto each item',
    view: (model, h) => Group.view(model, {
      options: [{ value: 'one', label: h.span([], ['One']) }, { value: 'two', label: h.span([], ['Two']) }],
      selectedValue: Option.none(),
      ariaLabel: 'Choice',
      props: { size: { initial: '3', md: '1' }, variant: 'classic', highContrast: true, color: 'red' },
    }, h as HtmlBuilder<RadioGroup.Message>),
    rootClass: 'rt-RadioGroupRoot',
    itemClasses: ['rt-r-size-3', 'md:rt-r-size-1', 'rt-variant-classic', 'rt-high-contrast'],
    color: 'red',
  },
]

describe('Lane 2A pinned prop-to-DOM parity matrix', () => {
  it.each(rows)('$name', row => Scene.scene(
    { update, view: row.view },
    Scene.given(Group.init({ id: 'choices' })),
    Scene.expect(Scene.selector('.rt-RadioGroupRoot')).toHaveClass(row.rootClass),
    Scene.expect(Scene.selector('.rt-RadioGroupRoot')).not.toHaveAttr('data-accent-color'),
    ...row.itemClasses.map(className => [
      Scene.expect(Scene.selector('.rt-RadioGroupRoot')).not.toHaveClass(className),
      Scene.expect(Scene.selector('[role="radio"]')).toHaveClass(className),
    ]).flat(),
    ...(row.color === undefined
      ? [Scene.expect(Scene.selector('[role="radio"]')).not.toHaveAttr('data-accent-color')]
      : [Scene.expect(Scene.selector('[role="radio"]')).toHaveAttr('data-accent-color', row.color)]),
  ))
})

type SimpleRow = {
  name: string
  selector: string
  render: (h: HtmlBuilder<typeof Messages.Type>) => Html
  classes: ReadonlyArray<string>
  attrs: ReadonlyArray<readonly [string, string]>
  itemSelector?: string
  itemClasses?: ReadonlyArray<string>
  itemAttrs?: ReadonlyArray<readonly [string, string]>
  styles?: ReadonlyArray<readonly [string, string]>
  structureSelectors?: ReadonlyArray<string>
  absentRootAttrs?: ReadonlyArray<string>
  absentClasses?: ReadonlyArray<string>
  absentItemClasses?: ReadonlyArray<string>
  absentItemAttrs?: ReadonlyArray<string>
}

const simpleRows: ReadonlyArray<SimpleRow> = [
  {
    // Pin radix2solid@383676172abb84b4a1d2e54a087d290437ee8848: packages/themes/src/components/button.tsx:16-40.
    name: 'Button maps responsive initial size, highContrast, accent color, and radius',
    selector: 'button.rt-Button',
    render: h => Button.view({ size: { initial: '3', md: '1' }, highContrast: true, color: 'red', radius: 'large' }, ['Save'], h),
    classes: ['rt-r-size-3', 'md:rt-r-size-1', 'rt-high-contrast'],
    attrs: [['data-accent-color', 'red'], ['data-radius', 'large']],
  },
  {
    // Pin radix2solid@383676172abb84b4a1d2e54a087d290437ee8848: packages/themes/src/components/checkbox.tsx:10-18.
    name: 'Checkbox maps responsive initial size, highContrast, accent color, and radius',
    selector: 'button.rt-CheckboxRoot',
    render: h => Checkbox.view({ id: 'terms', size: { initial: '1', md: '3' }, highContrast: true, color: 'blue', radius: 'full', onCheckedChange: () => Messages.Tick() }, ['Terms'], h),
    classes: ['rt-r-size-1', 'md:rt-r-size-3', 'rt-high-contrast'],
    attrs: [['data-accent-color', 'blue']],
    absentRootAttrs: ['data-radius'],
  },
  {
    // Pin radix2solid@383676172abb84b4a1d2e54a087d290437ee8848: packages/themes/src/components/radio.tsx:10-32.
    name: 'Radio maps responsive initial size, highContrast, and accent color',
    selector: 'input.rt-BaseRadioRoot',
    render: h => Radio.view({ id: 'plan', value: 'pro', size: { initial: '3', md: '1' }, highContrast: true, color: 'green' }, ['Pro'], h),
    classes: ['rt-r-size-3', 'md:rt-r-size-1', 'rt-high-contrast'],
    attrs: [['data-accent-color', 'green']],
  },
  {
    // Pin radix2solid@383676172abb84b4a1d2e54a087d290437ee8848: packages/themes/src/components/switch.tsx:9-24.
    name: 'Switch maps responsive initial size, highContrast, and accent color',
    selector: 'button.rt-SwitchRoot',
    render: h => Switch.view({ id: 'updates', size: { initial: '1', md: '3' }, highContrast: true, color: 'cyan', radius: 'large' }, ['Updates'], h),
    classes: ['rt-r-size-1', 'md:rt-r-size-3', 'rt-high-contrast'],
    attrs: [['data-accent-color', 'cyan'], ['data-radius', 'large']],
  },
  {
    // Pin radix2solid@383676172abb84b4a1d2e54a087d290437ee8848: packages/themes/src/components/text-field.tsx:1-24.
    name: 'TextField maps responsive initial size, accent color, and radius',
    selector: '.rt-TextFieldRoot',
    render: h => TextField.view({ id: 'email', label: 'Email', size: { initial: '2', md: '3' }, color: 'iris', radius: 'small' }, [], h),
    classes: ['rt-r-size-2', 'md:rt-r-size-3'],
    attrs: [['data-accent-color', 'iris'], ['data-radius', 'small']],
  },
  {
    // Pin radix2solid@383676172abb84b4a1d2e54a087d290437ee8848: packages/themes/src/components/text-area.tsx:9-14.
    name: 'TextArea maps responsive initial size, accent color, and radius',
    selector: '.rt-TextAreaRoot',
    render: h => TextArea.view({ id: 'notes', label: 'Notes', size: { initial: '2', md: '3' }, color: 'orange', radius: 'medium' }, [], h),
    classes: ['rt-r-size-2', 'md:rt-r-size-3'],
    attrs: [['data-accent-color', 'orange'], ['data-radius', 'medium']],
  },
  {
    // Pin radix2solid@383676172abb84b4a1d2e54a087d290437ee8848: packages/themes/src/components/checkbox-group.tsx:13-35.
    name: 'CheckboxGroup keeps root props on each ItemCheckbox and only its root class on the group',
    selector: '.rt-CheckboxGroupRoot',
    render: h => CheckboxGroup.view({
      id: 'checks', label: h.span([], ['Choices']), size: { initial: '3', md: '1' }, variant: 'classic', color: 'red', highContrast: true,
      options: [{ value: 'one', label: h.span([], ['One']) }], selected: new Set<string>(), toggleMessage: () => Messages.Tick(),
    }, h),
    classes: ['rt-CheckboxGroupRoot'],
    attrs: [],
    itemSelector: '.rt-CheckboxGroupItemCheckbox',
    itemClasses: ['rt-r-size-3', 'md:rt-r-size-1', 'rt-variant-classic', 'rt-high-contrast'],
    itemAttrs: [['data-accent-color', 'red']],
    absentRootAttrs: ['data-accent-color'],
  },
  {
    // Pin radix2solid@383676172abb84b4a1d2e54a087d290437ee8848: packages/themes/src/components/checkbox-cards.tsx:10-40.
    name: 'CheckboxCards maps root props, accent and responsive custom columns and gap',
    selector: '.rt-CheckboxCardsRoot',
    render: h => CheckboxCards.view({
      id: 'cards', label: 'Plans', size: '3', variant: 'classic', color: 'blue', highContrast: true, columns: '250px 1fr', gap: '12px',
      options: [{ value: 'one', label: ['One'] }], selected: new Set<string>(), toggleMessage: () => Messages.Tick(),
    }, h),
    classes: ['rt-Grid', 'rt-CheckboxCardsRoot', 'rt-r-size-3', 'rt-variant-classic', 'rt-high-contrast', 'rt-r-gtc', 'rt-r-gap'],
    attrs: [['data-accent-color', 'blue']],
    styles: [['--grid-template-columns', '250px 1fr'], ['--gap', '12px']],
    itemSelector: '.rt-CheckboxCardCheckbox',
    itemClasses: ['rt-r-size-3', 'rt-variant-surface', 'rt-high-contrast'],
    itemAttrs: [],
  },
  {
    // Pin radix2solid@383676172abb84b4a1d2e54a087d290437ee8848: packages/themes/src/components/radio-cards.tsx:10-43.
    name: 'RadioCards maps root props, root accent marker, and card semantics',
    selector: '.rt-RadioCardsRoot',
    render: h => {
      const cards = RadioCards.create<'one'>()
      return cards.view(cards.init({ id: 'cards' }), {
        options: [{ value: 'one', label: h.span([], ['One']) }], selectedValue: Option.none(), ariaLabel: 'Plans',
        props: { size: { initial: '3', md: '1' }, variant: 'classic', color: 'green', highContrast: true, columns: '250px 1fr', gap: '12px' },
      }, h as unknown as HtmlBuilder<RadioCards.Message>)
    },
    classes: ['rt-Grid', 'rt-RadioCardsRoot', 'rt-r-size-3', 'md:rt-r-size-1', 'rt-variant-classic', 'rt-high-contrast', 'rt-r-gtc', 'rt-r-gap'],
    attrs: [['data-accent-color', 'green']],
    styles: [['--grid-template-columns', '250px 1fr'], ['--gap', '12px']],
    itemSelector: '[role="radio"]',
    itemClasses: ['rt-reset', 'rt-BaseCard', 'rt-RadioCardsItem'],
    itemAttrs: [],
  },
  {
    // Pin radix2solid@383676172abb84b4a1d2e54a087d290437ee8848: packages/themes/src/components/checkbox-cards.tsx:10-40.
    name: 'CheckboxCards default grid matches pinned 200px columns and gap 4',
    selector: '.rt-CheckboxCardsRoot',
    render: h => CheckboxCards.view({
      id: 'default-cards', label: 'Plans', options: [{ value: 'one', label: ['One'] }], selected: new Set<string>(), toggleMessage: () => Messages.Tick(),
    }, h),
    classes: ['rt-Grid', 'rt-CheckboxCardsRoot', 'rt-r-size-2', 'rt-variant-surface', 'rt-r-gtc', 'rt-r-gap-4'],
    attrs: [],
    styles: [['--grid-template-columns', 'repeat(auto-fit, minmax(200px, 1fr))']],
  },
  {
    // Pin radix2solid@383676172abb84b4a1d2e54a087d290437ee8848: packages/themes/src/components/radio-cards.tsx:10-43.
    name: 'RadioCards default grid matches pinned 160px columns and gap 4',
    selector: '.rt-RadioCardsRoot',
    render: h => {
      const cards = RadioCards.create<'one'>()
      return cards.view(cards.init({ id: 'default-radio-cards' }), {
        options: [{ value: 'one', label: h.span([], ['One']) }], selectedValue: Option.none(), ariaLabel: 'Plans',
      }, h as unknown as HtmlBuilder<RadioCards.Message>)
    },
    classes: ['rt-Grid', 'rt-RadioCardsRoot', 'rt-r-size-2', 'rt-variant-surface', 'rt-r-gtc', 'rt-r-gap-4'],
    attrs: [],
    styles: [['--grid-template-columns', 'repeat(auto-fit, minmax(160px, 1fr))']],
  },
  {
    // Pin radix2solid@383676172abb84b4a1d2e54a087d290437ee8848: packages/themes/src/components/segmented-control.tsx:12-29.
    name: 'SegmentedControl maps disabled, radius, responsive size, and on/off radio state',
    selector: '.rt-SegmentedControlRoot',
    render: h => {
      const control = SegmentedControl.create<'one' | 'two'>()
      return control.view(control.init({ id: 'segments' }), {
        options: [{ value: 'one', label: h.span([], ['One']) }, { value: 'two', label: h.span([], ['Two']) }],
        selectedValue: Option.some('one'), ariaLabel: 'Plans', name: 'plans',
        props: { size: { initial: '2', md: '3' }, disabled: true, radius: 'large', variant: 'classic', m: '2' },
      }, h as unknown as HtmlBuilder<SegmentedControl.Message>)
    },
    classes: ['rt-SegmentedControlRoot', 'rt-r-size-2', 'md:rt-r-size-3', 'rt-variant-classic', 'rt-r-m-2'],
    attrs: [['data-disabled', ''], ['data-radius', 'large']],
    itemSelector: '.rt-SegmentedControlItem[data-state="on"]',
    itemClasses: ['rt-SegmentedControlItem'],
    itemAttrs: [['role', 'radio'], ['data-state', 'on']],
    absentRootAttrs: ['data-accent-color'],
    absentClasses: ['rt-RadioGroupRoot'],
    absentItemClasses: ['rt-RadioGroupItem', 'rt-r-size-2', 'rt-r-size-3', 'rt-variant-classic', 'rt-high-contrast'],
    absentItemAttrs: ['data-accent-color', 'data-radius', 'data-disabled'],
    structureSelectors: ['.rt-SegmentedControlIndicator', '.rt-SegmentedControlItemSeparator', '.rt-SegmentedControlItemLabel', '.rt-SegmentedControlItemLabel .rt-SegmentedControlItemLabelActive', '.rt-SegmentedControlItemLabel .rt-SegmentedControlItemLabelInactive'],
  },
  {
    // Pin radix2solid@383676172abb84b4a1d2e54a087d290437ee8848: packages/themes/src/components/slider.tsx:10-40.
    name: 'Range maps accent and radius to the root and highContrast to its range',
    selector: '.rt-SliderRoot',
    render: h => Slider.view(Slider.init({ id: 'range', min: 0, max: 100, step: 1 }), {
      value: 50, ariaLabel: 'Range', props: { highContrast: true, color: 'iris', radius: 'full' },
    }, h as unknown as HtmlBuilder<Slider.Message>),
    classes: ['rt-SliderRoot'],
    attrs: [['data-accent-color', 'iris'], ['data-radius', 'full']],
    itemSelector: '.rt-SliderRange',
    itemClasses: ['rt-high-contrast'],
    itemAttrs: [],
  },
  {
    // Pin radix2solid@383676172abb84b4a1d2e54a087d290437ee8848: packages/themes/src/components/theme.tsx:1-54.
    name: 'Theme emits its pinned default accent and radius markers',
    selector: '.radix-themes',
    render: h => Theme.view({ settings: {}, isRoot: true }, [], h),
    classes: [],
    attrs: [['data-accent-color', 'indigo'], ['data-radius', 'medium']],
  },
]

describe('Lane 2A common prop-to-DOM parity matrix', () => {
  it.each(simpleRows)('$name', row => Scene.scene(
    { update: (model: Readonly<Record<string, never>>, _message: typeof Messages.Type) => ({ model }), view: (_model, h) => row.render(h) },
    Scene.given({}),
    Scene.expect(Scene.selector(row.selector)).toExist(),
    ...row.classes.map(className => Scene.expect(Scene.selector(row.selector)).toHaveClass(className)),
    ...row.attrs.map(([name, value]) => Scene.expect(Scene.selector(row.selector)).toHaveAttr(name, value)),
    ...row.styles?.map(([property, value]) => Scene.expect(Scene.selector(row.selector)).toHaveStyle(property, value)) ?? [],
    ...(row.itemSelector === undefined ? [] : [Scene.expect(Scene.selector(row.itemSelector)).toExist()]),
    ...(row.itemSelector === undefined ? [] : row.itemClasses?.map(className => Scene.expect(Scene.selector(row.itemSelector!)).toHaveClass(className)) ?? []),
    ...(row.itemSelector === undefined ? [] : row.itemAttrs?.map(([name, value]) => Scene.expect(Scene.selector(row.itemSelector!)).toHaveAttr(name, value)) ?? []),
    ...row.absentRootAttrs?.map(name => Scene.expect(Scene.selector(row.selector)).not.toHaveAttr(name)) ?? [],
    ...row.absentClasses?.map(className => Scene.expect(Scene.selector(row.selector)).not.toHaveClass(className)) ?? [],
    ...(row.itemSelector === undefined ? [] : row.absentItemClasses?.map(className => Scene.expect(Scene.selector(row.itemSelector!)).not.toHaveClass(className)) ?? []),
    ...(row.itemSelector === undefined ? [] : row.absentItemAttrs?.map(name => Scene.expect(Scene.selector(row.itemSelector!)).not.toHaveAttr(name)) ?? []),
    ...row.structureSelectors?.map(selector => Scene.expect(Scene.selector(selector)).toExist()) ?? [],
  ))
})
const SelectBox = Select.create<'one'>()
type SelectMessage = Select.Message | typeof Messages.Type | undefined
const selectUpdate = (model: Select.Model, message: SelectMessage) => message === undefined ? { model } : message._tag === 'Tick' ? { model } : SelectBox.update(model, message)
const selectView = (position: Select.Config<'one'>['position']) => (model: Select.Model, h: HtmlBuilder<SelectMessage>) => SelectBox.view(model, {
  id: 'choice',
  selectedValue: Option.none(),
  position,
  isModal: false,
  props: { size: { initial: '3', md: '1' }, variant: 'classic', contentVariant: 'soft', color: 'teal', radius: 'full', highContrast: true },
  items: [{ value: 'one', textValue: 'One', isDisabled: false, content: h.span([], ['One']) }],
}, h as HtmlBuilder<Select.Message>)
// Pin radix2solid@383676172abb84b4a1d2e54a087d290437ee8848: packages/themes/src/components/select.tsx:38-68.
describe('Lane 2A Select prop-to-DOM parity', () => {
  it.each(['item-aligned', 'popper'] as const)('maps trigger and content props in %s position', position => Scene.scene(
    { update: selectUpdate, view: selectView(position) },
    Scene.given(SelectBox.init({ id: 'choice', selectedValue: Option.none(), position, items: [], isModal: false })),
    Scene.keydown(Scene.role('combobox', { name: 'choice' }), 'ArrowDown'),
    Scene.Command.resolve(Listbox.FocusItems, Listbox.Message.CompletedFocusItems()),
    ...(position === 'item-aligned'
      ? [
        Scene.Mount.expectHas(Listbox.AnchorListbox({
          buttonId: 'choice-button',
          anchor: { placement: 'bottom-start', gap: 4 },
          anchorMode: 'SelectedOrActiveItem',
          selectedItemId: 'choice-item-0',
        })),
        Scene.Mount.resolve(Listbox.AnchorListbox, Listbox.Message.CompletedAnchorListbox()),
        Scene.Mount.resolve(Listbox.PortalListboxBackdrop, Listbox.Message.CompletedPortalListboxBackdrop()),
        Scene.Mount.resolve({ name: 'ScrollAreaSync' }, Listbox.Message.CompletedPortalListboxBackdrop()),
      ]
      : [
        Scene.Mount.expectHas(Listbox.AnchorListbox({
          buttonId: 'choice-button',
          anchor: { placement: 'bottom-start', gap: 4 },
        })),
        Scene.Mount.resolve(Listbox.AnchorListbox, Listbox.Message.CompletedAnchorListbox()),
        Scene.Mount.resolve(Listbox.PortalListboxBackdrop, Listbox.Message.CompletedPortalListboxBackdrop()),
        Scene.Mount.resolve({ name: 'ScrollAreaSync' }, Listbox.Message.CompletedPortalListboxBackdrop()),
      ]),
    Scene.expect(Scene.selector('.rt-SelectTrigger')).toHaveClass('rt-r-size-3'),
    Scene.expect(Scene.selector('.rt-SelectTrigger')).toHaveClass('md:rt-r-size-1'),
    Scene.expect(Scene.selector('.rt-SelectTrigger')).toHaveClass('rt-variant-classic'),
    Scene.expect(Scene.selector('.rt-SelectTrigger')).not.toHaveClass('rt-variant-soft'),
    Scene.expect(Scene.selector('.rt-SelectTrigger')).not.toHaveClass('rt-high-contrast'),
    Scene.expect(Scene.selector('.rt-SelectTrigger')).toHaveAttr('data-accent-color', 'teal'),
    Scene.expect(Scene.selector('.rt-SelectTrigger')).toHaveAttr('data-radius', 'full'),
    Scene.expect(Scene.selector('.rt-SelectTrigger')).toHaveAttr('aria-controls', 'choice-items'),
    Scene.expect(Scene.selector('.rt-SelectContent')).toHaveClass('rt-SelectContent'),
    Scene.expect(Scene.selector('.rt-SelectContent')).toHaveClass('rt-variant-soft'),
    Scene.expect(Scene.selector('.rt-SelectContent')).not.toHaveClass('rt-variant-classic'),
    Scene.expect(Scene.selector('.rt-SelectContent')).not.toHaveClass('rt-variant-solid'),
    Scene.expect(Scene.selector('.rt-SelectContent')).toHaveClass('rt-high-contrast'),
    Scene.expect(Scene.selector('.rt-SelectContent')).toHaveAttr('data-accent-color', 'teal'),
    Scene.expect(Scene.selector('.rt-SelectContent')).toHaveAttr('data-radius', 'full'),
    Scene.expect(Scene.selector('.rt-SelectViewport')).toExist(),
    Scene.expect(Scene.selector('.rt-ScrollAreaRoot')).toExist(),
    Scene.expect(Scene.selector('.rt-ScrollAreaViewport')).toExist(),
    Scene.expect(Scene.selector('.rt-ScrollAreaScrollbar')).toExist(),
    Scene.expect(Scene.selector('.rt-ScrollAreaThumb')).toExist(),
    ...(position === 'popper'
      ? [Scene.expect(Scene.selector('.rt-SelectContent')).toHaveClass('rt-PopperContent')]
      : [Scene.expect(Scene.selector('.rt-SelectContent')).not.toHaveClass('rt-PopperContent')]),
  ))
})
