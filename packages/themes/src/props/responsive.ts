import { breakpoints, type Breakpoint } from './breakpoints.js'
import { classTable } from './classTable.js'

export type Responsive<T> = T | Partial<Record<Breakpoint, T>>

export interface ResponsivePropDef {
  readonly className: string
  readonly values?: ReadonlyArray<string>
  readonly customProperties?: ReadonlyArray<`--${string}`>
  readonly parseValue?: (value: string) => string | undefined
  readonly classNames?: Readonly<Record<string, string>>
  readonly breakpointClassNames?: Readonly<Record<Breakpoint, Readonly<Record<string, string>>>>
  readonly breakpointClassNamesBase?: Readonly<Record<Breakpoint, string>>
  readonly breakpointProperties?: Readonly<Record<string, Readonly<Record<Breakpoint, string>>>>
}

export const responsiveProp = <Values extends string>(config: {
  readonly className: string
  readonly values?: ReadonlyArray<Values>
  readonly customProperties?: ReadonlyArray<`--${string}`>
  readonly parseValue?: (value: string) => string | undefined
  readonly classNames?: Readonly<Record<string, string>>
}): ResponsivePropDef => {
  const { className, values, customProperties, parseValue, classNames: overrides } = config
  const generatedClassNames = values === undefined ? undefined : classTable(`${className}-`, values)
  const classNames = generatedClassNames === undefined || overrides === undefined
    ? generatedClassNames
    : Object.freeze({ ...generatedClassNames, ...overrides })
  const breakpointClassNames = values === undefined ? undefined : Object.freeze(Object.fromEntries(
    breakpoints.map(breakpoint => {
      const prefix = `${breakpoint === 'initial' ? '' : `${breakpoint}:`}${className}-`
      const generated = classTable(prefix, values)
      const mapped = overrides === undefined ? generated : Object.freeze({
        ...generated,
        ...Object.fromEntries(Object.entries(overrides).map(([value, name]) => [value, name.replace(`${className}-`, prefix)])),
      })
      return [breakpoint, mapped]
    }),
  )) as Readonly<Record<Breakpoint, Readonly<Record<string, string>>>>
  const breakpointClassNamesBase = Object.freeze(Object.fromEntries(
    breakpoints.map(breakpoint => [breakpoint, `${breakpoint === 'initial' ? '' : `${breakpoint}:`}${className}`]),
  )) as Readonly<Record<Breakpoint, string>>
  const breakpointProperties = customProperties === undefined ? undefined : Object.freeze(Object.fromEntries(
    customProperties.map(property => [property, Object.freeze(Object.fromEntries(
      breakpoints.map(breakpoint => [breakpoint, `${property}${breakpoint === 'initial' ? '' : `-${breakpoint}`}`]),
    ))]),
  )) as Readonly<Record<string, Readonly<Record<Breakpoint, string>>>>
  return Object.freeze({ className, values, customProperties, parseValue, classNames, breakpointClassNames, breakpointClassNamesBase, breakpointProperties })
}

export const responsiveClasses = (
  prop: ResponsivePropDef,
  value: Responsive<string> | undefined,
): { classes: ReadonlyArray<string>; style: Readonly<Record<string, string>> } => {
  if (value === undefined) return { classes: [], style: {} }
  const classes: string[] = []
  const style: Record<string, string> = {}
  const responsiveValues: Partial<Record<Breakpoint, string>> = typeof value === 'string'
    ? { initial: value }
    : value

  for (const breakpoint of breakpoints) {
    const current = responsiveValues[breakpoint]
    if (current === undefined) continue
    const enumClass = prop.breakpointClassNames?.[breakpoint]?.[current]
    if (enumClass !== undefined) {
      classes.push(enumClass)
      continue
    }
    const parsed = prop.parseValue?.(current) ?? current
    const properties = prop.customProperties
    if (properties === undefined || (prop.values !== undefined && prop.values.includes(current))) continue
    classes.push(prop.breakpointClassNamesBase?.[breakpoint] ?? prop.className)
    for (const property of properties) {
      const styleProperty = prop.breakpointProperties?.[property]?.[breakpoint] ?? property
      style[styleProperty] = parsed
    }
  }
  return { classes, style }
}
