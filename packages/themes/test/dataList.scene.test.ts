import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as DataList from '../src/components/data-list.js'
const Messages = defineMessageUnion({ Tick: {} })
type Message = typeof Messages.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => DataList.Root.view({}, [DataList.Label.view({}, ['Name'], h), DataList.Value.view({}, ['Ada'], h)], h)
describe('DataList', () => it('renders description list parts', () => Scene.scene({ update, view }, Scene.given({}), Scene.expect(Scene.selector('dl.rt-DataListRoot')).toExist(), Scene.expect(Scene.selector('dt.rt-DataListLabel')).toHaveText('Name'), Scene.expect(Scene.selector('dd.rt-DataListValue')).toHaveText('Ada'))))
