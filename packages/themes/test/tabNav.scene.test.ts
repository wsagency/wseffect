import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as TabNav from '../src/components/tab-nav.js'

describe('TabNav', () => {
  it('uses links with aria-current and native tab order', () => {
    const props: TabNav.Props = {
      items: [
        { value: 'overview', href: '/overview', label: 'Overview' },
        { value: 'activity', href: '/activity', label: 'Activity' },
      ],
      currentValue: 'activity',
      ariaLabel: 'Project sections',
      size: '2',
    }
    const update = (model: null, _message: never) => ({ model })
    const view = (_model: null, h: HtmlBuilder<never>) => TabNav.view(props, [], h)
    Scene.scene(
      { update, view }, Scene.given(null),
      Scene.expect(Scene.selector('nav.rt-TabsRoot')).toExist(),
      Scene.expect(Scene.selector('.rt-TabsList')).toExist(),
      Scene.expect(Scene.selector('a[href="/activity"]')).toHaveAttr('data-active', ''),
      Scene.expect(Scene.role('link')).toExist(),
      Scene.expect(Scene.selector('a[href="/overview"]')).toHaveAttr('href', '/overview'),
      Scene.expect(Scene.selector('a[href="/activity"]')).toHaveAttr('aria-current', 'page'),
      Scene.expect(Scene.selector('a[href="/overview"]')).not.toHaveAttr('tabindex'),
    )
  })
})
