import type { HtmlBuilder } from 'foldkit/html'
import * as Avatar from '@wsagency/wseffect-themes/components/avatar'
import { renderCaptureView } from '../captureView.js'
import type { CaptureRequest } from '../capture.js'

const avatarView = <M>(h: HtmlBuilder<M>, props: Record<string, unknown> = {}) => Avatar.view({ fallback: 'JD', ...(props as Partial<Avatar.ViewProps>) }, [], h)

export function renderCapture(root: HTMLElement, request: CaptureRequest): void { renderCaptureView(root, request, h => avatarView(h, { ...request.props, fallback: 'JD' })) }
