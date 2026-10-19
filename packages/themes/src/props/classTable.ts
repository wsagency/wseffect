export const classTable = <Values extends string>(
  prefix: string,
  values: ReadonlyArray<Values>,
): Readonly<Record<Values, string>> => {
  const table = {} as Record<Values, string>
  for (const value of values) table[value] = `${prefix}${value}`
  return Object.freeze(table)
}
