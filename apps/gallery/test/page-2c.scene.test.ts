import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, it } from 'vitest'
import { type PageInputs } from '../src/contract.js'
import { page as accessibility } from '../src/pages/accessibility.js'
import { page as layoutExtra } from '../src/pages/layoutExtra.js'
import { page as avatar } from '../src/pages/avatar.js'
import { page as feedback } from '../src/pages/feedback.js'
import { page as typographyExtra } from '../src/pages/typographyExtra.js'
import { page as iconButton } from '../src/pages/iconButton.js'
import { page as links } from '../src/pages/links.js'
import { Message as ScrollAreaMessage, page as scrollArea } from '../src/pages/scrollArea.js'
import { Message as DataMessage, page as data } from '../src/pages/data.js'
import { page as themePanel } from '../src/pages/themePanel.js'

const inputs: PageInputs = { path: '/components/accessibility', date: '2026-10-19', accentColor: 'indigo', grayColor: 'auto', radius: 'medium', scaling: '100%', appearance: 'inherit', panelBackground: 'translucent' }

describe('Gallery lane 2C pages', () => {
  it('renders accessible icon and visually hidden descriptions', () => {
    const initial = accessibility.init()
    Scene.scene({ update: accessibility.update, view: (model, h) => accessibility.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.role('heading', { name: 'Accessibility' })).toExist(),
      Scene.expect(Scene.text('Search')).toExist(),
      Scene.expect(Scene.text('Only available to assistive technology')).toExist())
  })

  it('renders responsive layout components with explicit size and ratio examples', () => {
    const initial = layoutExtra.init()
    Scene.scene({ update: layoutExtra.update, view: (model, h) => layoutExtra.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.role('heading', { name: 'Layout extras' })).toExist(),
      Scene.expect(Scene.text('Aspect ratio content')).toExist(),
      Scene.expect(Scene.selector('[data-radix-aspect-ratio-wrapper]')).toExist(),
      Scene.expect(Scene.selector('.rt-Section.rt-r-size-2')).toExist())
  })

  it('renders avatar fallbacks and a solid variant', () => {
    const initial = avatar.init()
    Scene.scene({ update: avatar.update, view: (model, h) => avatar.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.role('heading', { name: 'Avatars' })).toExist(),
      Scene.expect(Scene.text('JD')).toExist(),
      Scene.expect(Scene.selector('.rt-AvatarRoot.rt-variant-solid')).toExist())
  })

  it('renders feedback components with an outline badge and classic progress', () => {
    const initial = feedback.init()
    Scene.scene({ update: feedback.update, view: (model, h) => feedback.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.role('heading', { name: 'Feedback' })).toExist(),
      Scene.expect(Scene.text('Profile updated')).toExist(),
      Scene.expect(Scene.role('progressbar')).toExist(),
      Scene.expect(Scene.selector('.rt-Badge.rt-variant-outline')).toExist(),
      Scene.expect(Scene.selector('.rt-ProgressRoot.rt-variant-classic')).toExist())
  })

  it('renders semantic typography samples with a soft keyboard key', () => {
    const initial = typographyExtra.init()
    Scene.scene({ update: typographyExtra.update, view: (model, h) => typographyExtra.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.role('heading', { name: 'Typography extras' })).toExist(),
      Scene.expect(Scene.text('A thoughtful quotation')).toExist(),
      Scene.expect(Scene.text('Ctrl')).toExist(),
      Scene.expect(Scene.selector('.rt-Kbd.rt-variant-soft')).toExist())
  })

  it('adds through the icon button click action', () => {
    const initial = iconButton.init()
    Scene.scene({ update: iconButton.update, view: (model, h) => iconButton.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.role('heading', { name: 'Icon buttons' })).toExist(),
      Scene.expect(Scene.selector('.rt-IconButton.rt-variant-outline')).toExist(),
      Scene.click(Scene.role('button', { name: 'Add' })),
      Scene.expect(Scene.text('Added: 1')).toExist())
  })

  it('renders a descriptive link with an explicit underline modifier', () => {
    const initial = links.init()
    Scene.scene({ update: links.update, view: (model, h) => links.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.expect(Scene.role('heading', { name: 'Links' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'Read the guide' })).toExist(),
      Scene.expect(Scene.selector('.rt-Link.rt-underline-always')).toExist(),
      Scene.expect(Scene.selector('.rt-Link')).toHaveAttr('data-accent-color', ''))
  })

  it('renders vertically scrollable content with an explicit size', () => {
    const initial = scrollArea.init()
    Scene.scene({ update: scrollArea.update, view: (model, h) => scrollArea.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.Mount.resolve({ name: 'ScrollAreaSync' }, ScrollAreaMessage.Tick()),
      Scene.expect(Scene.role('heading', { name: 'Scroll area' })).toExist(),
      Scene.expect(Scene.text('Scrollable item 1')).toExist(),
      Scene.expect(Scene.selector('.rt-ScrollAreaScrollbar.rt-r-size-2')).toExist(),
      Scene.expect(Scene.selector('.rt-ScrollAreaCorner')).toBeAbsent())
  })

  it('renders tabular and list data with explicit visual modifiers', () => {
    const initial = data.init()
    Scene.scene({ update: data.update, view: (model, h) => data.view(model, inputs, h) }, Scene.given(initial.model),
      Scene.Mount.resolve({ name: 'ScrollAreaSync' }, DataMessage.Tick()),
      Scene.expect(Scene.role('heading', { name: 'Data' })).toExist(),
      Scene.expect(Scene.text('Ada Lovelace')).toExist(),
      Scene.expect(Scene.text('Grace Hopper')).toExist(),
      Scene.expect(Scene.selector('.rt-TableRoot.rt-variant-ghost')).toExist(),
      Scene.expect(Scene.selector('.rt-DataListRoot.rt-r-orientation-vertical')).toExist())
  })

  it('opens theme settings and changes an appearance option', () => {
    const initial = themePanel.init()
    Scene.scene({
      update: (model: typeof themePanel.Model.Type, message: typeof themePanel.Message.Type) => ({ model: themePanel.update(model, message).model }),
      view: (model, h) => themePanel.view(model, inputs, h),
    }, Scene.given(initial.model),
    Scene.expect(Scene.role('button', { name: 'Open theme settings' })).toExist(),
    Scene.click(Scene.role('button', { name: 'Open theme settings' })),
    Scene.expect(Scene.role('region', { name: 'Theme settings' })).toExist(),
    Scene.click(Scene.role('radio', { name: 'Dark' })),
    Scene.expect(Scene.role('radio', { name: 'Dark' })).toHaveAttr('aria-checked', 'true'))
  })
})
