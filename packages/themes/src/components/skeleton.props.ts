import { Schema } from 'effect'
import { responsiveSchema } from '../props/componentSchema.js'
import { marginPropSchemas } from '../props/margin.props.js'
export const Props = Schema.Struct({ loading: Schema.optional(Schema.Boolean), width: Schema.optional(responsiveSchema([], true)), height: Schema.optional(responsiveSchema([], true)), ...marginPropSchemas })
export type ViewProps = typeof Props.Type
