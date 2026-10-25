import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, it } from 'vitest'
import * as AccessibleIcon from '../src/components/accessible-icon.js'

const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) =>
  AccessibleIcon.view({ label: 'Close' }, [h.svg([h.AriaHidden(false)], [])], h)

describe('themed AccessibleIcon', () => {
  it('applies accessibility attributes to the target icon and renders a hidden sibling label', () => {
    Scene.scene({ update, view }, Scene.given({}),
      Scene.expect(Scene.selector('svg')).toHaveAttr('aria-hidden', 'true'),
      Scene.expect(Scene.selector('svg')).toHaveAttr('focusable', 'false'),
      Scene.expect(Scene.text('Close')).toExist(),
      Scene.expect(Scene.selector('[role="img"]')).not.toExist())
  })
})
