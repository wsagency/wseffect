import '@wsagency/wseffect-themes/css/slider.css'
import { Range as SliderRange } from '@wsagency/wseffect-themes/components/slider/range'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'
import type { HtmlBuilder } from 'foldkit/html'

const singleThumbs = [{ id: 'Minimum value', value: 48 }]
const rangeThumbs = [{ id: 'Minimum value', value: 25 }, { id: 'Maximum value', value: 70 }]
const rangeConfig = (thumbs = singleThumbs) => ({ min: 0, max: 100, step: 1, orientation: 'horizontal' as const, thumbs, props: { size: '2' as const, variant: 'surface' as const, color: 'indigo' as const } })

export function renderCapture(root: HTMLElement, request: CaptureRequest): void {
  const thumbs = request.state === 'range-keyboard-focus' ? rangeThumbs : singleThumbs
  const baseProps = rangeConfig().props
  const config = { ...rangeConfig(thumbs), props: { ...baseProps, ...request.props } }
  renderCaptureView(root, request, h => SliderRange.view(SliderRange.init(config), config, h as unknown as HtmlBuilder<typeof SliderRange.Message.Type>))
}
