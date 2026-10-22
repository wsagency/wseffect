import { Schema } from 'effect'
import { responsiveSchema } from './componentSchema.js'
import { paddingValues } from './padding.classes.js'
export { paddingClasses, paddingPropDefs, paddingValues } from './padding.classes.js'

export const paddingPropSchemas = {
  p: Schema.optional(responsiveSchema(paddingValues, true)),
  px: Schema.optional(responsiveSchema(paddingValues, true)),
  py: Schema.optional(responsiveSchema(paddingValues, true)),
  pt: Schema.optional(responsiveSchema(paddingValues, true)),
  pr: Schema.optional(responsiveSchema(paddingValues, true)),
  pb: Schema.optional(responsiveSchema(paddingValues, true)),
  pl: Schema.optional(responsiveSchema(paddingValues, true)),
}
