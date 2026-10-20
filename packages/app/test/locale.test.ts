import { Effect } from 'effect'
import { describe, expect, it, vi } from 'vitest'
import { LocaleService, makeLocale } from '../src/locale.js'

describe('Locale formatter service', () => {
  it('reuses a number formatter for repeated normalized options', () => {
    const numberFormat = vi.spyOn(Intl, 'NumberFormat')
    try {
      const locale = makeLocale('en-US')
      expect(locale.number(1234.5, { maximumFractionDigits: 2 })).toBe('1,234.5')
      expect(locale.number(1234.5, { maximumFractionDigits: 2 })).toBe('1,234.5')
      expect(numberFormat).toHaveBeenCalledTimes(1)
    } finally {
      numberFormat.mockRestore()
    }
  })

  it('normalizes equivalent option keys and distinguishes distinct keys', () => {
    const numberFormat = vi.spyOn(Intl, 'NumberFormat')
    try {
      const locale = makeLocale('en-US')
      locale.number(10, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      locale.number(10, { maximumFractionDigits: 2, minimumFractionDigits: 2 })
      locale.number(10, { maximumFractionDigits: 3 })
      expect(numberFormat).toHaveBeenCalledTimes(2)
    } finally {
      numberFormat.mockRestore()
    }
  })

  it('evicts the least recently used formatter at capacity', () => {
    const numberFormat = vi.spyOn(Intl, 'NumberFormat')
    try {
      const locale = makeLocale('en-US')
      for (let i = 0; i < 65; i++) locale.number(1, { minimumFractionDigits: i % 21, minimumSignificantDigits: Math.floor(i / 21) + 1 })
      locale.number(1, { minimumFractionDigits: 0, minimumSignificantDigits: 1 })
      expect(numberFormat.mock.calls.length).toBe(66)
    } finally {
      numberFormat.mockRestore()
    }
  })

  it('isolates locale caches and uses a new Layer after locale changes', async () => {
    const [us, de] = await Effect.runPromise(Effect.all([
      Effect.service(LocaleService).pipe(Effect.provide(LocaleService.layer('en-US'))),
      Effect.service(LocaleService).pipe(Effect.provide(LocaleService.layer('de-DE'))),
    ]))
    const fr = await Effect.runPromise(Effect.service(LocaleService).pipe(Effect.provide(LocaleService.layer('fr-FR'))))
    expect(us.locale).toBe('en-US')
    expect(de.locale).toBe('de-DE')
    expect(fr.locale).toBe('fr-FR')
    expect(us.number(1234.5)).toBe('1,234.5')
    expect(de.number(1234.5)).toBe('1.234,5')
    expect(fr.number(1234.5)).toBe('1 234,5')
  })

  it('supports all native Intl formatting operations with the explicit locale', () => {
    const locale = makeLocale('en-US')
    expect(locale.dateTime(new Date('2020-01-02T00:00:00.000Z'), { timeZone: 'UTC', dateStyle: 'short' })).toBe('1/2/20')
    expect(locale.relativeTime(-1, 'day')).toBe('1 day ago')
    expect(locale.plural(2)).toBe('other')
  })

  it('passes the explicit locale to every native Intl formatter', () => {
    const numberFormat = vi.spyOn(Intl, 'NumberFormat')
    const dateTimeFormat = vi.spyOn(Intl, 'DateTimeFormat')
    const relativeTimeFormat = vi.spyOn(Intl, 'RelativeTimeFormat')
    const pluralRules = vi.spyOn(Intl, 'PluralRules')
    try {
      const locale = makeLocale('fr-FR')
      locale.number(1)
      locale.dateTime(0)
      locale.relativeTime(1, 'day')
      locale.plural(1)
      expect(numberFormat.mock.calls[0]?.[0]).toBe('fr-FR')
      expect(dateTimeFormat.mock.calls[0]?.[0]).toBe('fr-FR')
      expect(relativeTimeFormat.mock.calls[0]?.[0]).toBe('fr-FR')
      expect(pluralRules.mock.calls[0]?.[0]).toBe('fr-FR')
    } finally {
      numberFormat.mockRestore()
      dateTimeFormat.mockRestore()
      relativeTimeFormat.mockRestore()
      pluralRules.mockRestore()
    }
  })
  it('does not grow beyond 64 formatters for arbitrary caller options', () => {
    const numberFormat = vi.spyOn(Intl, 'NumberFormat')
    try {
      const locale = makeLocale('en-US')
      for (let i = 0; i < 1000; i++) locale.number(1, { maximumFractionDigits: i % 21, minimumIntegerDigits: (i % 21) + 1 })
      expect(numberFormat.mock.calls.length).toBeLessThanOrEqual(64)
      expect(locale.number(1)).toBe('1')
    } finally {
      numberFormat.mockRestore()
    }
  })
})
