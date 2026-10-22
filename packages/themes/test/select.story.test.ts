import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Listbox from '@foldkit/ui/listbox'
import * as Scene from 'foldkit/scene'
import { defineMessageUnion } from 'foldkit/message'
import { describe, expect, it } from 'vitest'
import * as Select from '../src/components/select.js'

const SelectBox = Select.create<'one' | 'two' | 'three'>()
const Other = defineMessageUnion({ Tick: {} })
type Other = typeof Other.Type
const update = (model: Select.Model, message: Select.Message | Other | undefined) => message === undefined ? { model } : message._tag === 'Tick' ? { model } : SelectBox.update(model, message)
const makeView = (position: Select.Config<'one' | 'two' | 'three'>['position']) => (model: Select.Model, h: HtmlBuilder<Select.Message | Other | undefined>) => SelectBox.view(model, {
  id: 'choice',
  selectedValue: Option.none(),
  position,
  items: [
    { id: 'group', label: h.span([], ['Group']), items: [{ value: 'one', textValue: 'One', isDisabled: false, content: h.span([], ['One']) }, { kind: 'separator', id: 'divider' }, { value: 'two', textValue: 'Two', isDisabled: true, content: h.span([], ['Two']) }] },
    { value: 'three', textValue: 'Three', isDisabled: false, content: h.span([], ['Three']) },
  ],
  isModal: false,
}, h as HtmlBuilder<Select.Message>)
const view = makeView('item-aligned')
const popperView = makeView('popper')

describe('Select', () => {
  it('supports groups, separators, disabled options and typeahead in item-aligned placement', () => Scene.scene(
    { update, view },
    Scene.given(SelectBox.init({ id: 'choice', selectedValue: Option.none(), position: 'item-aligned', items: [], isModal: false })),
    Scene.click(Scene.selector('[role="combobox"]')),
    Scene.Command.resolve(Listbox.FocusItems, Listbox.Message.CompletedFocusItems()),
    Scene.Mount.resolve({ name: 'SelectPosition' }, undefined as never),
    Scene.expect(Scene.role('listbox', { name: 'choice' })).toExist(),
    Scene.keydown(Scene.role('listbox', { name: 'choice' }), 't'),
    Scene.Command.resolve(Listbox.DelayClearSearch, Listbox.Message.CompletedDelayClearSearch({ version: 1 })),
    Scene.expect(Scene.selector('#choice-item-3')).toHaveAttr('data-active', 'true'),
  ))
  it('renders groups and sibling separators in the popper Scene', () => Scene.scene(
    { update, view: popperView },
    Scene.given(SelectBox.init({ id: 'choice', selectedValue: Option.none(), position: 'popper', items: [], isModal: false })),
    Scene.click(Scene.role('combobox', { name: 'choice' })),
    Scene.Command.resolve(Listbox.FocusItems, Listbox.Message.CompletedFocusItems()),
    Scene.Mount.resolve(Listbox.AnchorListbox, Listbox.Message.CompletedAnchorListbox()),
    Scene.Mount.resolve(Listbox.PortalListboxBackdrop, Listbox.Message.CompletedPortalListboxBackdrop()),
    Scene.expect(Scene.role('listbox', { name: 'choice' })).toExist(),
    Scene.expect(Scene.selector('.rt-SelectContent')).toExist(),
    Scene.expect(Scene.selector('.rt-SelectViewport')).toExist(),
    Scene.expect(Scene.selector('.rt-SelectGroup')).toExist(),
    Scene.expect(Scene.selector('.rt-SelectLabel')).toExist(),
    Scene.expect(Scene.role('separator')).toExist(),
  ))
  it('builds its parent fold adapter', () => {
    const fold = SelectBox.fold<{ select: Select.Model }, Other, never>({
      read: parent => Option.some(parent.select),
      write: (parent, select) => ({ ...parent, select }),
      toParentMessage: () => Other.Tick(),
      foldOutMessage: () => model => ({ model }),
    })
    expect(fold).toBeDefined()
  })
  it('embeds under the supplied parent slot', () => {
    const embeddedView = (model: Select.Model, h: HtmlBuilder<Select.Message | Other>) => SelectBox.embed(h, {
      slotId: 'choice-select',
      model,
      toParentMessage: () => Other.Tick(),
      viewInputs: { id: 'choice', selectedValue: Option.none(), position: 'item-aligned', items: [], isModal: false },
    })
    Scene.scene({ update, view: embeddedView }, Scene.given(SelectBox.init({ id: 'choice', selectedValue: Option.none(), position: 'item-aligned', items: [], isModal: false })), Scene.expect(Scene.role('combobox', { name: 'choice' })).toExist())
  })
  it.each(['item-aligned', 'popper'] as const)('matches the pinned Select content structure in %s position', position => {
    const config: Select.Config<'one' | 'two' | 'three'> = {
      id: 'choice',
      selectedValue: Option.none(),
      position,
      isModal: false,
      props: { variant: 'classic', contentVariant: 'soft', highContrast: true },
      items: [{
        id: 'group',
        label: null,
        items: [
          { value: 'one', textValue: 'One', isDisabled: false, content: null },
          { kind: 'separator', id: 'divider' },
          { value: 'two', textValue: 'Two', isDisabled: false, content: null },
        ],
      }],
    }
    const view = function themedSelectView(model: Select.Model, h: HtmlBuilder<Select.Message | Other>): Html {
      return SelectBox.view(model, config, h as HtmlBuilder<Select.Message>)
    }
    Scene.scene(
      { update, view },
      Scene.given(SelectBox.init({ ...config, items: [] })),
      Scene.keydown(Scene.role('combobox', { name: 'choice' }), 'ArrowDown'),
      Scene.Command.resolve(Listbox.FocusItems, Listbox.Message.CompletedFocusItems()),
      ...(position === 'popper'
        ? [
          Scene.Mount.resolve(Listbox.AnchorListbox, Listbox.Message.CompletedAnchorListbox()),
          Scene.Mount.resolve(Listbox.PortalListboxBackdrop, Listbox.Message.CompletedPortalListboxBackdrop()),
        ]
        : [Scene.Mount.resolve({ name: 'SelectPosition' }, undefined as never)]),
      Scene.expect(Scene.selector('.rt-SelectTrigger')).toHaveClass('rt-variant-classic'),
      Scene.expect(Scene.selector('.rt-SelectTrigger')).not.toHaveClass('rt-high-contrast'),
      Scene.expect(Scene.selector('.rt-SelectContent')).toHaveClass('rt-variant-soft'),
      Scene.expect(Scene.selector('.rt-SelectContent')).toHaveClass('rt-high-contrast'),
      Scene.expect(Scene.selector('.rt-SelectContent')).toHaveAttr('data-accent-color', 'indigo'),
      Scene.expect(Scene.selector('.rt-SelectContent')).not.toHaveClass('rt-variant-classic'),
      Scene.expect(Scene.selector('.rt-ScrollAreaRoot')).toExist(),
      Scene.expect(Scene.selector('.rt-SelectViewport.rt-ScrollAreaViewport')).toExist(),
      Scene.expect(Scene.selector('.rt-ScrollAreaScrollbar')).toExist(),
      Scene.expect(Scene.selector('.rt-ScrollAreaThumb')).toExist(),
      ...(position === 'popper'
        ? [Scene.expect(Scene.selector('.rt-SelectContent')).toHaveClass('rt-PopperContent')]
        : [Scene.expect(Scene.selector('.rt-SelectContent')).not.toHaveClass('rt-PopperContent')]),
    )
  })
})
