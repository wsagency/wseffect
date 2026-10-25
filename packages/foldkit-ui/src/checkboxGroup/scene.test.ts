import { Schema } from 'effect'
import type { Update } from '@wsagency/wseffect-foldkit'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { modifyFields } from '@wsagency/wseffect-foldkit/struct'

import { describe, it } from '@effect/vitest'

import { view } from './index.js'

const Message = defineMessageUnion({ Toggled: { value: Schema.String, isChecked: Schema.Boolean } })
type Message = typeof Message.Type
type Model = Readonly<{ selected: ReadonlySet<string> }>

const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match(message, {
    Toggled: ({ value, isChecked }) => ({
      model: modifyFields(model, {
        selected: selected => {
          const next = new Set(selected)
          if (isChecked) next.add(value)
          else next.delete(value)
          return next
        },
      }),
    }),
  })

const testView = (model: Model, h: HtmlBuilder<Message>) => view({
  id: 'filters',
  label: h.span([], ['Options']),
  options: [
    { value: 'ready', label: h.span([], ['Ready']) },
    { value: 'archived', label: h.span([], ['Archived']), isDisabled: true },
  ],
  selected: model.selected,
  toggleMessage: (value, isChecked) => Message.Toggled({ value, isChecked }),
  toView: ({ rootAttributes, labelAttributes, options }) => h.div(rootAttributes, [
    h.span(labelAttributes, ['Options']),
    ...options.map(({ option, checkbox }) => h.div([...checkbox.checkbox], [option.label])),
  ]),
}, h)

describe('CheckboxGroup', () => {
  it('composes checked and disabled Checkbox semantics without owning selection', () => {
    Scene.scene(
      { update, view: testView },
      Scene.given({ selected: new Set(['ready']) }),
      Scene.expect(Scene.role('group')).toHaveAttr('aria-labelledby', 'filters-label'),
      Scene.expect(Scene.role('checkbox', { name: 'Ready' })).toHaveAttr('aria-checked', 'true'),
      Scene.expect(Scene.role('checkbox', { name: 'Archived' })).toHaveAttr('aria-disabled', 'true'),
      Scene.click(Scene.role('checkbox', { name: 'Ready' })),
      Scene.expect(Scene.role('checkbox', { name: 'Ready' })).toHaveAttr('aria-checked', 'false'),
    )
  })
})
