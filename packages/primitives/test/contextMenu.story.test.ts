import { Option, Schema } from 'effect'
import * as Menu from '@foldkit/ui/menu'
import { expect, it } from 'vitest'
import * as ContextMenu from '../src/context-menu.js'

const menu = ContextMenu.createContextMenu<'edit' | 'delete'>()
const config: ContextMenu.ContextMenuConfig<'edit' | 'delete'> = {
  id: 'actions', items: [
    { value: 'edit', textValue: 'Edit', isDisabled: true, content: null },
    { value: 'delete', textValue: 'Delete', isDisabled: false, content: null },
  ], longPressMs: 600, sourceId: 'source', sourceToken: 'token-1', toItem: () => null,
}
const openPointer = menu.update(menu.init(config), {
  _tag: 'OpenedAt', invocation: { sourceId: 'source', sourceToken: 'token-1', invocation: 'pointer', point: { x: 80, y: 120 } },
})

it('pointer opens at client point', () => {
  expect(openPointer.model.isOpen).toBe(true)
  expect(openPointer.model.invocation?.point).toEqual({ x: 80, y: 120 })
})

it('keyboard opens on source and focuses first enabled', () => {
  const result = menu.update(menu.init(config), {
    _tag: 'OpenedAt', invocation: { sourceId: 'source', sourceToken: 'token-1', invocation: 'keyboard' },
  })
  expect(result.model.isOpen).toBe(true)
  expect(result.model.maybeActiveItemIndex).toEqual(Option.none())
  expect(result.commands?.some(command => command.name === 'FocusItems' || command.name === 'FocusButton')).toBe(false)
})

it('touch long press activates at 600ms and cancels on >8px move/release', () => {
  const pointerDown = menu.update(menu.init(config), {
    _tag: 'OpenedAt', invocation: { sourceId: 'source', sourceToken: 'token-1', invocation: 'touch', point: { x: 10, y: 20 } },
  })
  const opened = menu.update(pointerDown.model, { _tag: 'LongPressExpired', version: pointerDown.model.longPressVersion })
  expect(opened.model.isOpen).toBe(true)
  const cancelled = menu.update(pointerDown.model, Menu.Message.IgnoredMouseClick())
  expect(cancelled.model.longPressVersion).toBeGreaterThan(pointerDown.model.longPressVersion)
})

it('all close paths filter fixed-button focus', () => {
  const closed = menu.update(openPointer.model, Menu.Message.Closed())
  expect(closed.commands?.some(command => command.name === 'FocusButton')).toBe(false)
})

it('does not focus a replacement source after source unmount', () => {
  const result = menu.update(openPointer.model, { _tag: 'SourceUnmounted', token: 'token-1' })
  expect(result.model.isOpen).toBe(false)
  expect(result.commands?.some(command => command.name === 'FocusSource' || command.name === 'FocusButton')).toBe(false)
})

it('local Model and Message schemas round-trip through the APP-8 page-model codec', () => {
  const encoded = Schema.encodeSync(ContextMenu.ContextMenuModelSchema)(openPointer.model)
  expect(Schema.decodeUnknownSync(ContextMenu.ContextMenuModelSchema)(encoded)).toEqual(openPointer.model)
  const message: ContextMenu.ContextMenuMessage = { _tag: 'OpenedAt', invocation: { sourceId: 'source', sourceToken: 'token-1', invocation: 'keyboard' } }
  const encodedMessage = Schema.encodeSync(ContextMenu.ContextMenuMessageSchema)(message)
  expect(Schema.decodeUnknownSync(ContextMenu.ContextMenuMessageSchema)(encodedMessage)).toEqual(message)
})
