import { Schema } from 'effect'
import { responsiveSchema } from './componentSchema.js'
import { marginValues } from './margin.classes.js'
export { marginClasses, marginPropDefs, marginValues } from './margin.classes.js'

export const marginPropSchemas = {
  m: Schema.optional(responsiveSchema(marginValues, true)),
  mx: Schema.optional(responsiveSchema(marginValues, true)),
  my: Schema.optional(responsiveSchema(marginValues, true)),
  mt: Schema.optional(responsiveSchema(marginValues, true)),
  mr: Schema.optional(responsiveSchema(marginValues, true)),
  mb: Schema.optional(responsiveSchema(marginValues, true)),
  ml: Schema.optional(responsiveSchema(marginValues, true)),
}

