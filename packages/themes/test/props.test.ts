import { describe, expect, it } from 'vitest'
import { Schema } from 'effect'
import { classTable } from '../src/props/classTable.js'
import { responsiveClasses } from '../src/props/responsive.js'
import { paddingPropDefs } from '../src/props/padding.props.js'

import * as AccessibleIcon from '../src/components/accessible-icon.js'
import * as AspectRatio from '../src/components/aspect-ratio.js'
import * as Avatar from '../src/components/avatar.js'
import * as Badge from '../src/components/badge.js'
import * as Blockquote from '../src/components/blockquote.js'
import * as Callout from '../src/components/callout.js'
import * as Code from '../src/components/code.js'
import * as Container from '../src/components/container.js'
import * as DataList from '../src/components/data-list.js'
import * as Em from '../src/components/em.js'
import * as IconButton from '../src/components/icon-button.js'
import * as Inset from '../src/components/inset.js'
import * as Kbd from '../src/components/kbd.js'
import * as Link from '../src/components/link.js'
import * as Progress from '../src/components/progress.js'
import * as Quote from '../src/components/quote.js'
import * as ScrollArea from '../src/components/scroll-area.js'
import * as Section from '../src/components/section.js'
import * as Separator from '../src/components/separator.js'
import * as Skeleton from '../src/components/skeleton.js'
import * as Spinner from '../src/components/spinner.js'
import * as Strong from '../src/components/strong.js'
import * as Table from '../src/components/table.js'
import * as ThemePanel from '../src/components/theme-panel.js'
import * as VisuallyHidden from '../src/components/visually-hidden.js'
import * as Checkbox from '../src/components/checkbox.js'
import * as CheckboxGroup from '../src/components/checkbox-group.js'
import * as CheckboxCards from '../src/components/checkbox-cards.js'
import * as Radio from '../src/components/radio.js'
import * as RadioGroup from '../src/components/radio-group.js'
import * as RadioCards from '../src/components/radio-cards.js'
import * as SegmentedControl from '../src/components/segmented-control.js'
import * as Select from '../src/components/select.js'
import * as Slider from '../src/components/slider.js'
import * as Switch from '../src/components/switch.js'
import * as TextArea from '../src/components/text-area.js'
import * as TabNav from '../src/components/tab-nav.js'
import * as Theme from '../src/index.js'

const decode = <S extends Schema.ConstraintDecoder<unknown>>(schema: S, value: unknown) => Schema.decodeUnknownSync(schema)(value)

const schemaMatrix = [
  ['AccessibleIcon', AccessibleIcon.Props, { label: 'Add' }, { label: 1 }],
  ['AspectRatio', AspectRatio.Props, { ratio: 1.5 }, { ratio: 'wide' }],
  ['Avatar', Avatar.Props, { fallback: 'AB', size: { initial: '3', md: '4' }, variant: 'solid', color: 'crimson', radius: 'full' }, { size: '99' }],
  ['Badge', Badge.Props, { size: { initial: '1', md: '2' }, variant: 'soft', color: 'crimson' }, { variant: 'classic' }],
  ['Blockquote', Blockquote.Props, { size: { md: '3' }, wrap: 'balance' }, { size: '99' }],
  ['Callout.Root', Callout.Root.Props, { size: { initial: '2', md: '3' }, variant: 'soft', color: 'crimson' }, { variant: 'classic' }],
  ['Callout.Icon', Callout.Icon.Props, {}, undefined],
  ['Callout.Text', Callout.Text.Props, { size: { md: '3' }, align: 'center', wrap: 'balance' }, { align: 'sideways' }],
  ['Code', Code.Props, { size: { md: '3' }, variant: 'ghost', wrap: 'pretty' }, { variant: 'bad' }],
  ['Container', Container.Props, { size: '3', align: 'center', position: { md: 'relative' } }, { size: '99' }],
  ['DataList.Root', DataList.Root.Props, { orientation: 'vertical', size: '3', trim: 'both' }, { orientation: 'diagonal' }],
  ['DataList.Item', DataList.Item.Props, { align: 'baseline' }, { align: 'diagonal' }],
  ['DataList.Label', DataList.Label.Props, { width: { md: '240px' }, color: 'crimson' }, { highContrast: 'yes' }],
  ['DataList.Value', DataList.Value.Props, {}, undefined],
  ['Em', Em.Props, { wrap: 'balance', truncate: true }, { wrap: 'invalid' }],
  ['IconButton', IconButton.Props, { size: '3', variant: 'ghost', color: 'crimson', radius: 'full' }, { size: '99' }],
  ['Inset', Inset.Props, { side: 'x', clip: 'padding-box', p: { md: 'current' } }, { side: 'diagonal' }],
  ['Kbd', Kbd.Props, { size: { md: '3' }, variant: 'soft' }, { variant: 'ghost' }],
  ['Link', Link.Props, { href: '/docs', size: { md: '3' }, underline: 'hover' }, { underline: 'sometimes' }],
  ['Progress', Progress.Props, { size: '3', variant: 'soft', color: 'crimson', value: 50 }, { size: '99' }],
  ['Quote', Quote.Props, { wrap: 'balance', truncate: true }, { wrap: 'invalid' }],
  ['ScrollArea', ScrollArea.Props, { size: { md: '2' }, scrollbars: 'vertical', radius: 'full' }, { scrollbars: 'diagonal' }],
  ['Section', Section.Props, { size: '3', display: 'none' }, { size: '99' }],
  ['Separator', Separator.Props, { orientation: { md: 'vertical' }, size: '2', color: 'crimson' }, { orientation: 'diagonal' }],
  ['Skeleton', Skeleton.Props, { loading: true, width: { md: '240px' }, height: '2rem' }, { loading: 'yes' }],
  ['Spinner', Spinner.Props, { size: { md: '3' }, loading: true }, { size: '99' }],
  ['Strong', Strong.Props, { wrap: 'balance', truncate: true }, { wrap: 'invalid' }],
  ['Table.Root', Table.Root.Props, { size: '3', variant: 'surface', layout: 'fixed' }, { size: '99' }],
  ['Table.Header', Table.Header.Props, {}, undefined],
  ['Table.Body', Table.Body.Props, {}, undefined],
  ['Table.Row', Table.Row.Props, { align: { md: 'center' } }, { align: 'diagonal' }],
  ['Table.Cell', Table.Cell.Props, { justify: 'center', width: { md: '240px' }, p: '2' }, { justify: 'diagonal' }],
  ['Table.ColumnHeaderCell', Table.ColumnHeaderCell.Props, { justify: 'center', minWidth: '120px' }, { justify: 'diagonal' }],
  ['Table.RowHeaderCell', Table.RowHeaderCell.Props, { maxWidth: { md: '240px' }, px: '2' }, { maxWidth: 42 }],
  ['ThemePanel', ThemePanel.Props, { isOpen: false, settings: {} }, { isOpen: 'no' }],
  ['VisuallyHidden', VisuallyHidden.Props, {}, undefined],
  ['Box', Theme.Box.Props, { display: { md: 'block' }, width: '100%' }, { display: 'invalid' }],
  ['Flex', Theme.Flex.Props, { direction: { initial: 'column', md: 'row' }, gap: '3' }, { direction: 'diagonal' }],
  ['Grid', Theme.Grid.Props, { columns: { md: '3' }, gap: '4' }, { columns: 42 }],
  ['Text', Theme.Text.Props, { as: 'p', size: { md: '4' }, color: 'crimson' }, { size: '99' }],
  ['Heading', Theme.Heading.Props, { as: 'h2', size: '6', color: 'crimson' }, { size: '99' }],
  ['Card', Theme.Card.Props, { variant: 'surface', size: '2' }, { variant: 'invalid' }],
  ['Button', Theme.Button.Props, { size: '2', variant: 'solid', color: 'crimson' }, { size: '99' }],
  ['TextField', Theme.TextField.Props, { id: 'email', label: 'Email', size: '2', variant: 'surface', color: 'crimson' }, { color: 'not-a-radix-color' }],
  ['Checkbox', Checkbox.Props, { id: 'terms', size: { initial: '2', md: '3' }, variant: 'classic', color: 'crimson', checked: true, onCheckedChange: () => undefined }, { size: '99', onCheckedChange: () => undefined }],
  ['CheckboxGroup', CheckboxGroup.Props, { id: 'choices', size: { initial: '2', md: '3' }, variant: 'soft', color: 'crimson' }, { variant: 'invalid' }],
  ['CheckboxCards', CheckboxCards.Props, { id: 'plans', label: 'Plans', size: '3', variant: 'classic', columns: { md: '2' }, gap: { initial: '3', md: '4' } }, { size: '99' }],
  ['Radio', Radio.Props, { id: 'one', value: 'one', size: '2', variant: 'soft', checked: true }, { size: '99' }],
  ['RadioGroup', RadioGroup.Props, { size: { initial: '2', md: '3' }, variant: 'soft', color: 'crimson' }, { variant: 'ghost' }],
  ['RadioCards', RadioCards.Props, { size: { md: '3' }, variant: 'classic', columns: '2', gap: { md: '4' } }, { variant: 'ghost' }],
  ['SegmentedControl', SegmentedControl.Props, { size: { initial: '2', md: '3' }, variant: 'classic', radius: 'full' }, { variant: 'soft' }],
  ['Select', Select.Props, { size: { initial: '2', md: '3' }, variant: 'ghost', contentVariant: 'soft', color: 'crimson', placeholder: 'Choose' }, { contentVariant: 'outline' }],
  ['Slider', Slider.Props, { size: { initial: '2', md: '3' }, variant: 'soft', color: 'crimson', radius: 'full' }, { variant: 'ghost' }],
  ['Switch', Switch.Props, { id: 'alerts', size: '2', variant: 'surface', checked: true }, { variant: 'ghost' }],
  ['TextArea', TextArea.Props, { id: 'message', size: { initial: '2', md: '3' }, variant: 'soft', resize: 'vertical', rows: 4 }, { resize: 'diagonal' }],
  ['TabNav', TabNav.Props, { items: [{ value: 'overview', href: '/overview', label: 'Overview' }], currentValue: 'overview', ariaLabel: 'Sections', size: { initial: '2', md: '1' }, wrap: 'wrap', justify: 'center', color: 'crimson' }, { size: '99' }],
] as const

describe('public component prop schemas', () => {
  it.each(schemaMatrix)('%s accepts pinned props and rejects invalid values', (_name, schema, valid, invalid) => {
    expect(decode(schema, valid)).toBeDefined()
    if (invalid !== undefined) expect(() => decode(schema, invalid)).toThrow()
  })
})
describe('responsive prop classes', () => {
  it('reuses the frozen empty result for undefined values', () => {
    const first = responsiveClasses(paddingPropDefs.p, undefined)
    const second = responsiveClasses(paddingPropDefs.p, undefined)
    expect(second).toBe(first)
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first.classes)).toBe(true)
    expect(Object.isFrozen(first.style)).toBe(true)
  })
  it('maps enum values to their precomputed base class', () => {
    expect(responsiveClasses(paddingPropDefs.p, '4')).toEqual({ classes: ['rt-r-p-4'], style: {} })
  })

  it('maps responsive enum values to breakpoint-prefixed classes', () => {
    expect(responsiveClasses(paddingPropDefs.p, { initial: '2', md: '4' })).toEqual({
      classes: ['rt-r-p-2', 'md:rt-r-p-4'],
      style: {},
    })
  })

  it('maps arbitrary values to a custom property class', () => {
    expect(responsiveClasses(paddingPropDefs.p, '13px')).toEqual({
      classes: ['rt-r-p'],
      style: { '--p': '13px' },
    })
  })

  it('maps responsive arbitrary values to breakpoint custom properties', () => {
    expect(responsiveClasses(paddingPropDefs.p, { sm: '13px' })).toEqual({
      classes: ['sm:rt-r-p'],
      style: { '--p-sm': '13px' },
    })
  })

  it('maps px arbitrary values to both CSS properties', () => {
    expect(responsiveClasses(paddingPropDefs.px, '13px')).toEqual({
      classes: ['rt-r-px'],
      style: { '--pl': '13px', '--pr': '13px' },
    })
  })

  it('maps responsive px arbitrary values to both breakpoint custom properties', () => {
    expect(responsiveClasses(paddingPropDefs.px, { md: '13px' })).toEqual({
      classes: ['md:rt-r-px'],
      style: { '--pl-md': '13px', '--pr-md': '13px' },
    })
  })

  it('freezes precomputed class maps', () => {
    const variants = classTable('rt-variant-', ['solid', 'soft'] as const)
    expect(variants).toEqual({ solid: 'rt-variant-solid', soft: 'rt-variant-soft' })
    expect(Object.isFrozen(variants)).toBe(true)
    expect(variants.solid).toBe(variants.solid)
  })
})
