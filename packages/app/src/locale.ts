import { Context, Layer } from 'effect'

export interface Locale {
  readonly locale: string
  readonly number: (value: number, options?: Intl.NumberFormatOptions) => string
  readonly dateTime: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string
  readonly relativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions) => string
  readonly plural: (value: number, options?: Intl.PluralRulesOptions) => Intl.LDMLPluralRule
}

type Formatter = Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat | Intl.PluralRules

const cacheCapacity = 64

export function makeLocale(locale: string): Locale {
  const formatters = new Map<string, Formatter>()
  const formatter = <A extends Formatter>(kind: string, options: object | undefined, create: () => A): A => {
    const normalized = options === undefined
      ? ''
      : JSON.stringify(Object.keys(options).sort().map((key) => [key, (options as Record<string, unknown>)[key]]))
    const key = `${kind}:${normalized}`
    let value = formatters.get(key) as A | undefined
    if (value === undefined) {
      value = create()
      if (formatters.size === cacheCapacity) formatters.delete(formatters.keys().next().value!)
      formatters.set(key, value)
    } else {
      formatters.delete(key)
      formatters.set(key, value)
    }
    return value
  }

  return {
    locale,
    number: (value, options) => formatter('number', options, () => new Intl.NumberFormat(locale, options)).format(value),
    dateTime: (value, options) => formatter('dateTime', options, () => new Intl.DateTimeFormat(locale, options)).format(value),
    relativeTime: (value, unit, options) => formatter('relativeTime', options, () => new Intl.RelativeTimeFormat(locale, options)).format(value, unit),
    plural: (value, options) => formatter('plural', options, () => new Intl.PluralRules(locale, options)).select(value),
  }
}

export class LocaleService extends Context.Service<LocaleService, Locale>()('wseffect/Locale') {
  static layer(locale: string): Layer.Layer<LocaleService> {
    return Layer.succeed(LocaleService, makeLocale(locale))
  }
}
