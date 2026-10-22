import { createLazy } from 'foldkit/html'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { describe, expect, it, vi } from 'vitest'
import * as DataList from '../src/components/data-list.js'
import * as Table from '../src/components/table.js'
import { mountScrollArea } from '../src/components/scroll-area.mount.js'
const Messages = defineMessageUnion({ Tick: {}, Change: {} })
type Message = typeof Messages.Type
type Model = { changed: boolean }
const update = (model: Model, message: Message) => ({ model: message._tag === 'Change' ? { changed: true } : model })
const views = {
  dataList: vi.fn((size: '1' | '2', h: HtmlBuilder<Message>) => DataList.Root.view({ size }, [DataList.Label.view({}, ['Name'], h), DataList.Value.view({}, ['Ada'], h)], h)),
  table: vi.fn((size: '1' | '2', h: HtmlBuilder<Message>) => Table.Root.view({ size }, [Table.Body.view({}, [Table.Row.view({}, [Table.Cell.view({}, ['42'], h)], h)], h)], h)),
}
const lazy = { dataList: createLazy(), table: createLazy() }
describe('data views execution counters', () => it('unrelated update reuses view; changed arg re-executes once', () => {
  const view = (model: Model, h: HtmlBuilder<Message>) => h.div([], [
    lazy.dataList(views.dataList, [model.changed ? '2' : '1', h]), lazy.table(views.table, ['1', h]),
    h.button([h.OnClick(Messages.Tick())], ['unrelated']), h.button([h.OnClick(Messages.Change())], ['change']),
  ])
  Scene.scene({ update, view }, Scene.given({ changed: false }), Scene.Mount.resolve(mountScrollArea<Message>(), Messages.Tick()), Scene.click(Scene.role('button', { name: 'unrelated' })), Scene.expect(Scene.selector('dd.rt-DataListValue')).toHaveText('Ada'), Scene.click(Scene.role('button', { name: 'change' })), Scene.expect(Scene.role('cell', { name: '42' })).toExist())
  expect(views.dataList).toHaveBeenCalledTimes(2)
  expect(views.table).toHaveBeenCalledTimes(1)
}))
