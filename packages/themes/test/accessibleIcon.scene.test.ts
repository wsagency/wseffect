import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as AccessibleIcon from '../src/components/accessible-icon.js'

const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) =>
  AccessibleIcon.view({ label: 'Close' }, [h.svg([h.AriaHidden(true)], [])], h)

describe('themed AccessibleIcon', () => {
  it('labels icon contents', () => {
    Scene.scene({ update, view }, Scene.given({}),
      Scene.expect(Scene.selector('[role="img"]')).toHaveAttr('aria-label', 'Close'),
      Scene.expect(Scene.selector('svg')).toHaveAttr('aria-hidden', 'true'))
  })
})
