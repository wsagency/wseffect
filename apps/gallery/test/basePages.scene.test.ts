import * as Scene from 'foldkit/scene'
import { describe, expect, it } from 'vitest'
import { page as layoutPage } from '../src/pages/layout.js'
import { page as typographyPage } from '../src/pages/typography.js'
import { page as buttonsPage } from '../src/pages/buttons.js'
import { page as cardsPage } from '../src/pages/cards.js'
import { page as textFieldPage } from '../src/pages/textField.js'

const inputs = {
  date: '2026-10-19',
  accentColor: 'indigo',
  grayColor: 'auto',
  radius: 'medium',
  scaling: '100%',
  appearance: 'inherit',
  panelBackground: 'translucent',
} as const

describe('gallery base pages', () => {
  it('renders layout primitives from the page view', () => {
    const initial = layoutPage.init()
    Scene.scene({ update: layoutPage.update, view: (model, h) => layoutPage.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.role('heading', { name: 'Layout' })).toExist(),
      Scene.expect(Scene.text('Box layout')).toExist(),
      Scene.expect(Scene.text('Flex layout')).toExist(),
      Scene.expect(Scene.text('Grid layout')).toExist())
  })

  it('renders typography with semantic heading and text', () => {
    const initial = typographyPage.init()
    Scene.scene({ update: typographyPage.update, view: (model, h) => typographyPage.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.role('heading', { name: 'Typography' })).toExist(),
      Scene.expect(Scene.text('Typography sample text')).toExist())
  })

  it('renders an accessible themed button', () => {
    const initial = buttonsPage.init()
    Scene.scene({ update: buttonsPage.update, view: (model, h) => buttonsPage.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.role('heading', { name: 'Buttons' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Save changes' })).toExist())
  })

  it('renders a titled card', () => {
    const initial = cardsPage.init()
    Scene.scene({ update: cardsPage.update, view: (model, h) => cardsPage.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.role('heading', { name: 'Cards' })).toExist(),
      Scene.expect(Scene.text('Card sample')).toExist())
  })

  it('renders a labeled text field', () => {
    const initial = textFieldPage.init()
    Scene.scene({ update: textFieldPage.update, view: (model, h) => textFieldPage.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.role('heading', { name: 'Text field' })).toExist(),
      Scene.expect(Scene.role('textbox', { name: 'Email address' })).toExist())
  })
})
