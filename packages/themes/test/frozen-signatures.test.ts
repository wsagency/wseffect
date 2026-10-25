import { expectTypeOf, it } from 'vitest'
import type { Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Update from '@wsagency/wseffect-foldkit/update'
import * as Listbox from '@wsagency/wseffect-foldkit-ui/listbox'
import * as Menu from '@wsagency/wseffect-foldkit-ui/menu'
import * as Option from 'effect/Option'
import type { Props as CheckboxGroupProps } from '../../primitives/dist/checkbox-group.js'
import type { SelectBundle, SelectConfig, SelectModel } from '../../primitives/dist/select.js'
import type { ContextMenuBundle, ContextMenuModel } from '../../primitives/dist/context-menu.js'
import type * as Mount from '@wsagency/wseffect-foldkit/mount'
import type { mountSelectPosition } from '../../primitives/dist/select-position.js'

interface Item<Value extends string> { value: Value; label: string }
type Message = { readonly _tag: 'Changed' }
type Children = ReadonlyArray<Html | string>
type ViewSignature<Props, M> = (props: Props, children: Children, h: HtmlBuilder<M>) => Html

expectTypeOf<Children>().toEqualTypeOf<ReadonlyArray<Html | string>>()
expectTypeOf<ViewSignature<{ id: string }, Message>>().parameters.toEqualTypeOf<[
  { id: string }, ReadonlyArray<Html | string>, HtmlBuilder<Message>,
]>()
// @ts-expect-error children cannot contain numbers
const invalidChildren: Children = [1]
void invalidChildren

type ListboxModel = Listbox.Model
type ListboxMessage = Listbox.Message
const listbox = Listbox.create<Item<'a'>, 'a'>()
void listbox
const menu = Menu.create<'a'>()
void menu

// These aliases prove the exact current Foldkit Update return types are available.
type PlainUpdate = Update.Return<ListboxModel, ListboxMessage>
type ChildUpdate = Update.ReturnWithOutMessage<ListboxModel, ListboxMessage, Listbox.OutMessage<'a'>>
type Assert<Condition extends true> = Condition
type IsAny<T> = 0 extends (1 & T) ? true : false
type _PlainUpdateExists = Assert<PlainUpdate extends object ? true : false>
type _ChildUpdateExists = Assert<ChildUpdate extends object ? true : false>
type _UpdateNotAny = Assert<IsAny<PlainUpdate> extends false ? true : false>

// State and Message are deliberately non-generic on the upstream bundles; only OutMessage binds Value.
type SelectSurface = SelectBundle<'a'>
type ContextMenuSurface = ContextMenuBundle<'a'>
type IsFunction<T> = T extends (...args: never[]) => unknown ? true : false
type BundleMethods = 'init' | 'update' | 'view' | 'selectItem' | 'open' | 'close'
type _SelectBundleMethods = Assert<BundleMethods extends keyof SelectSurface ? true : false>
type _ContextMenuBundleMethods = Assert<BundleMethods extends keyof ContextMenuSurface ? true : false>
type _SelectInitCallable = Assert<IsFunction<SelectSurface['init']>>
type _SelectUpdateCallable = Assert<IsFunction<SelectSurface['update']>>
type _SelectViewCallable = Assert<IsFunction<SelectSurface['view']>>
type _ContextMenuInitCallable = Assert<IsFunction<ContextMenuSurface['init']>>
type _ContextMenuUpdateCallable = Assert<IsFunction<ContextMenuSurface['update']>>
type _ContextMenuViewCallable = Assert<IsFunction<ContextMenuSurface['view']>>
const none: SelectConfig<'a'>['selectedValue'] = Option.none()
void none

type CheckboxProps = CheckboxGroupProps<'a', Message>
type _ToggleMessageFactory = Assert<IsFunction<CheckboxProps['toggleMessage']>>
it('compiles the frozen Listbox and Menu bundle contracts', () => {
  expectTypeOf<SelectSurface['init']>().returns.toEqualTypeOf<SelectModel>()
  expectTypeOf<ContextMenuSurface['init']>().returns.toEqualTypeOf<ContextMenuModel>()
})

it('keeps SelectPosition as a message-free mount action', () => {
  expectTypeOf<typeof mountSelectPosition>().returns.toEqualTypeOf<Mount.MountAction<never>>()
})
