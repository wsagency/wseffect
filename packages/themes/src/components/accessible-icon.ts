import { Schema } from 'effect'
import type { Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { brandViewResult } from '@wsagency/wseffect-foldkit/brand'
import * as VisuallyHidden from './visually-hidden.js'
export const Props = Schema.Struct({ label: Schema.String })
export type ViewProps = typeof Props.Type

const hideIcon = (child: Html | string): Html | string => {
  if (typeof child === 'string' || child === null) return child
  const data = child.data ?? {}
  return { ...child, data: { ...data, attrs: { ...data.attrs, 'aria-hidden': 'true', focusable: 'false' } } } as Html
}

export const view = <Message>(props: ViewProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html =>
  brandViewResult(h.div([], [
    ...children.map(hideIcon),
    VisuallyHidden.view({}, [props.label], h),
  ]), 'wseffect/AccessibleIcon')
