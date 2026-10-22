import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import { type PageInputs } from '../src/contract.js'
import { page as formsExtra } from '../src/components/formsExtra.js'

const inputs: PageInputs = { path: '/components/forms-extra', date: '2026-10-22', accentColor: 'indigo', grayColor: 'auto', radius: 'medium', scaling: '100%', appearance: 'inherit', panelBackground: 'translucent' }

describe('Gallery forms-extra page', () => {
  it('renders form controls with defaults, modifiers, and accessible group names', () => {
    const initial = formsExtra.init()
    Scene.scene({ update: formsExtra.update, view: (model, h) => formsExtra.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.role('heading', { name: 'Forms extra' })).toExist(),
      Scene.expect(Scene.role('checkbox', { name: 'Enable notifications' })).toHaveAttr('aria-checked', 'false'),
      Scene.expect(Scene.role('group', { name: 'Notifications' })).toExist(),
      Scene.expect(Scene.role('group', { name: 'Plans' })).toExist(),
      Scene.expect(Scene.role('radiogroup', { name: 'Frequency' })).toExist(),
      Scene.expect(Scene.role('radiogroup', { name: 'Billing' })).toExist(),
      Scene.expect(Scene.role('switch', { name: 'Airplane mode' })).toHaveAttr('aria-checked', 'false'),
      Scene.expect(Scene.role('radiogroup', { name: 'View mode' })).toExist(),
      Scene.expect(Scene.selector('.rt-CheckboxGroupItemCheckbox[aria-checked="true"]')).toExist(),
      Scene.expect(Scene.selector('.rt-high-contrast')).toExist(),
      Scene.expect(Scene.selector('.rt-variant-soft')).toExist())
  })

  it('updates checkbox and switch selections accessibly', () => {
    const initial = formsExtra.init()
    Scene.scene({ update: formsExtra.update, view: (model, h) => formsExtra.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.click(Scene.role('checkbox', { name: 'Enable notifications' })),
      Scene.expect(Scene.role('checkbox', { name: 'Enable notifications' })).toHaveAttr('aria-checked', 'true'),
      Scene.click(Scene.role('switch', { name: 'Airplane mode' })),
      Scene.expect(Scene.role('switch', { name: 'Airplane mode' })).toHaveAttr('aria-checked', 'true'))
  })
})
