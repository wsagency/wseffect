import { describe, expect, it } from 'vitest'
import { renderCaptureView } from '../src/captureView.js'

describe('Gallery capture view runtime', () => {
  it('renders component captures under one root Theme and its portal host', async () => {
    document.body.innerHTML = '<div id="target"></div>'
    const target = document.getElementById('target')!
    await renderCaptureView(target, {
      family: 'accessibility',
      route: 'accessibility',
      id: 'accessibility/AccessibleIcon/default/dark',
      component: 'AccessibleIcon',
      state: 'default',
      theme: 'dark',
      props: {},
      fixtureId: null,
      fixture: null,
      visualReference: null,
    }, (h) => h.span([], ['Capture content']))

    expect(target.querySelector('[data-is-root-theme="true"]')).not.toBeNull()
    expect(target.querySelector('#foldkit-portal-root')).not.toBeNull()
    expect(target.textContent).toContain('Capture content')
  })
})
