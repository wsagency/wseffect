import { Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

export const Props = Schema.Struct({})
export type ViewProps = typeof Props.Type

const styles = Object.freeze({ position: 'absolute', border: '0', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', 'white-space': 'nowrap', 'word-wrap': 'normal' })

export const view = <Message>(_props: ViewProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html =>
  h.span([h.Class('rt-VisuallyHidden'), h.Style(styles)], children)
