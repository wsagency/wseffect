import { Schema } from 'effect'
import { breakpoints } from './breakpoints.js'

export const enumSchema = (values: ReadonlyArray<string>) => Schema.Literals(values)

export const responsiveSchema = (values: ReadonlyArray<string>, allowArbitrary = false) => {
  const value = allowArbitrary ? Schema.String : Schema.Literals(values)
  const fields = Object.fromEntries(breakpoints.map(breakpoint => [breakpoint, Schema.optional(value)]))
  return Schema.Union([value, Schema.Struct(fields)])
}
