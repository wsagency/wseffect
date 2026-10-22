import { Schema } from 'effect'
import { responsiveSchema } from '../props/componentSchema.js'
import { paddingPropSchemas } from '../props/padding.props.js'
import { marginPropSchemas } from '../props/margin.props.js'

const displayValues = ['none', 'inline', 'inline-block', 'block', 'contents', 'flex', 'inline-flex', 'grid', 'inline-grid'] as const

export const Props = Schema.Struct({
  as: Schema.optional(Schema.Literals(['div', 'span'])),
  display: Schema.optional(responsiveSchema(displayValues)),
  position: Schema.optional(responsiveSchema(['static', 'relative', 'absolute', 'fixed', 'sticky'])),
  overflow: Schema.optional(responsiveSchema(['visible', 'hidden', 'clip', 'scroll', 'auto'])),
  width: Schema.optional(responsiveSchema([], true)),
  minWidth: Schema.optional(responsiveSchema([], true)),
  maxWidth: Schema.optional(responsiveSchema([], true)),
  height: Schema.optional(responsiveSchema([], true)),
  minHeight: Schema.optional(responsiveSchema([], true)),
  maxHeight: Schema.optional(responsiveSchema([], true)),
  ...paddingPropSchemas,
  ...marginPropSchemas,
})
export type ViewProps = typeof Props.Type
