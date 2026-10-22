import { defineMessageUnion } from 'foldkit/message'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, it } from 'vitest'
import * as Progress from '../src/components/progress.js'
const Message = defineMessageUnion({ Tick: {} })
type Message = typeof Message.Type
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const view = (_model: Readonly<Record<string, never>>, h: HtmlBuilder<Message>) => Progress.view({ value: 40, max: 100 }, [], h)
describe('themed Progress', () => {
  it('exposes progress value', () => Scene.scene({ update, view }, Scene.given({}),
    Scene.expect(Scene.selector('[role="progressbar"]')).toHaveAttr('aria-valuenow', '40')))
  it('uses Foldkit progress state attributes', () => Scene.scene({ update, view }, Scene.given({}),
    Scene.expect(Scene.selector('[role="progressbar"]')).toHaveAttr('data-state', 'loading')))
})
  it('wires non-default Progress props to the R2S classes, styles, and attributes', () => Scene.scene(
    { update, view: (_model, h) => Progress.view({ id: 'upload-progress', ariaLabel: 'Upload progress', size: '3', variant: 'classic', color: 'crimson', highContrast: true, radius: 'full', value: 30, min: 10, max: 50, valueText: '30 of 50', duration: '2s' }, [], h) },
    Scene.given({}),
    Scene.expect(Scene.selector('[role="progressbar"]')).toHaveAttr('id', 'upload-progress'),
    Scene.expect(Scene.selector('[role="progressbar"]')).toHaveAttr('aria-label', 'Upload progress'),
    Scene.expect(Scene.selector('[role="progressbar"]')).toHaveAttr('class', 'rt-ProgressRoot rt-r-size-3 rt-variant-classic rt-high-contrast'),
    Scene.expect(Scene.selector('[role="progressbar"]')).toHaveAttr('data-accent-color', 'crimson'),
    Scene.expect(Scene.selector('[role="progressbar"]')).toHaveAttr('data-radius', 'full'),
    Scene.expect(Scene.selector('[role="progressbar"]')).toHaveAttr('aria-valuemin', '10'),
    Scene.expect(Scene.selector('[role="progressbar"]')).toHaveAttr('aria-valuemax', '50'),
    Scene.expect(Scene.selector('[role="progressbar"]')).toHaveAttr('aria-valuenow', '30'),
    Scene.expect(Scene.selector('[role="progressbar"]')).toHaveAttr('aria-valuetext', '30 of 50'),
    Scene.expect(Scene.selector('[role="progressbar"]')).toHaveAttr('data-min', '10'),
    Scene.expect(Scene.selector('[role="progressbar"]')).toHaveAttr('data-max', '50'),
    Scene.expect(Scene.selector('.rt-ProgressRoot')).toHaveStyle('--progress-duration', '2s'),
  ))
  it('uses aria-labelledby when ariaLabel is absent', () => Scene.scene(
    { update, view: (_model, h) => Progress.view({ id: 'labeled-progress', ariaLabelledBy: 'progress-label' }, [], h) },
    Scene.given({}),
    Scene.expect(Scene.selector('[role="progressbar"]')).toHaveAttr('aria-labelledby', 'progress-label'),
  ))
  it('does not synthesize an id or label relationship that R2S leaves unset', () => Scene.scene(
    { update, view: (_model, h) => Progress.view({}, [], h) },
    Scene.given({}),
    Scene.expect(Scene.selector('[id]')).not.toExist(),
    Scene.expect(Scene.selector('[aria-labelledby]')).not.toExist(),
  ))
  it('sets the CSS progress value and maximum', () => Scene.scene(
    { update, view: (_model, h) => Progress.view({ value: 40, max: 100 }, [], h) },
    Scene.given({}),
    Scene.expect(Scene.selector('.rt-ProgressRoot')).toHaveStyle('--progress-value', '40'),
    Scene.expect(Scene.selector('.rt-ProgressRoot')).toHaveStyle('--progress-max', '100'),
  ))
  it('uses the default value label and retains margins', () => Scene.scene(
    { update, view: (_model, h) => Progress.view({ value: 40, max: 100, m: '2' }, [], h) },
    Scene.given({}),
    Scene.expect(Scene.selector('[role="progressbar"]')).toHaveAttr('aria-valuetext', '40%'),
    Scene.expect(Scene.selector('[role="progressbar"]')).toHaveAttr('class', 'rt-ProgressRoot rt-r-size-2 rt-variant-surface rt-r-m-2'),
  ))
  it('uses the supplied value label callback', () => Scene.scene(
    { update, view: (_model, h) => Progress.view({ value: 40, max: 100, getValueLabel: value => `${value} files` }, [], h) },
    Scene.given({}),
    Scene.expect(Scene.selector('[role="progressbar"]')).toHaveAttr('aria-valuetext', '40 files'),
  ))
  it('renders indeterminate progress without a value and exposes maximum', () => Scene.scene(
    { update, view: (_model, h) => Progress.view({ value: null, max: 60 }, [], h) },
    Scene.given({}),
    Scene.expect(Scene.selector('[role="progressbar"]')).not.toHaveAttr('aria-valuenow'),
    Scene.expect(Scene.selector('[role="progressbar"]')).not.toHaveAttr('aria-valuetext'),
    Scene.expect(Scene.selector('[role="progressbar"]')).toHaveAttr('aria-valuemin', '0'),
    Scene.expect(Scene.selector('[role="progressbar"]')).toHaveAttr('aria-valuemax', '60'),
    Scene.expect(Scene.selector('[role="progressbar"]')).toHaveAttr('data-state', 'indeterminate'),
    Scene.expect(Scene.selector('[role="progressbar"]')).toHaveAttr('data-max', '60'),
    Scene.expect(Scene.selector('.rt-ProgressRoot')).toHaveStyle('--progress-max', '60'),
  ))
  // Pinned R2S progress.tsx:18-24 delegates the full-width indicator to ProgressPrimitive and scales it from the root value.
  it('scales the full-width indicator from the progress root value', () => Scene.scene(
    { update, view: (_model, h) => Progress.view({ value: 64, max: 100 }, [], h) },
    Scene.given({}),
    Scene.expect(Scene.selector('.rt-ProgressRoot')).toHaveStyle('--progress-value', '64'),
    Scene.expect(Scene.selector('.rt-ProgressIndicator')).not.toHaveStyle('width', '64%'),
  ))
