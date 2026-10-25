import { Effect } from 'effect'
import * as Menu from '@wsagency/wseffect-foldkit-ui/menu'
import { describe, expect, it } from 'vitest'
import * as ContextMenu from '../src/components/context-menu.js'

const menu = ContextMenu.create<'edit'>()
const config: ContextMenu.Config<'edit'> = {
  id: 'actions', sourceId: 'source', sourceToken: 'exact-live-token', longPressMs: 600,
  items: [{ value: 'edit', textValue: 'Edit', isDisabled: false, content: null }],
  toItem: () => null,
}

describe('ContextMenu wrapper', () => {
  it('restores the exact live source and filters FocusButton', async () => {
    const source = document.createElement('button')
    source.id = config.sourceId
    source.setAttribute('data-context-source-token', config.sourceToken)
    document.body.append(source)
    const opened = menu.update(menu.init(config), {
      _tag: 'OpenedAt',
      invocation: { sourceId: config.sourceId, sourceToken: config.sourceToken, invocation: 'keyboard' },
    })
    const closed = menu.update(opened.model, Menu.Message.Closed())
    const names = closed.commands?.map(command => command.name) ?? []
    expect(names).toContain('FocusSource')
    expect(names).not.toContain('FocusButton')
    const focus = closed.commands?.find(command => command.name === 'FocusSource')
    if (focus === undefined) throw new Error('A live keyboard source must be restored')
    await Effect.runPromise(focus.effect)
    expect(document.activeElement).toBe(source)
    source.remove()
  })
})
