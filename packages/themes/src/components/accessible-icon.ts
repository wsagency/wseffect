import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

export const Props = Schema.Struct({ label: Schema.String })
export type ViewProps = typeof Props.Type

export const view = <Message>(props: ViewProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html =>
  h.span([h.Role('img'), h.AriaLabel(props.label)], [h.span([h.AriaHidden(true), h.Attribute('focusable', 'false')], children)])
