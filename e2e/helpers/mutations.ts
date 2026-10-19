import type { Page } from '@playwright/test'

export async function startChildListRecorder(page: Page, ignoredSelector?: string): Promise<void> {
  await page.evaluate((selector) => {
    const state = { count: 0 }
    const countRecords = (records: ReadonlyArray<MutationRecord>): void => {
      state.count += records.filter((record) => {
        const target = record.target instanceof Element ? record.target : record.target.parentElement
        const insideTitle = target !== null && target.closest('title') !== null
        const insideIgnored = selector !== undefined && target !== null && target.closest(selector) !== null
        return !insideTitle && !insideIgnored
      }).length
    }
    const observer = new MutationObserver(countRecords)
    observer.observe(document, { subtree: true, childList: true })
    Object.assign(window, { __wseffectMutationRecorder: { state, observer, countRecords } })
  }, ignoredSelector)
}

export async function stopChildListRecorder(page: Page): Promise<number> {
  return page.evaluate(() => {
    const recorder = (window as Window & {
      __wseffectMutationRecorder?: {
        state: { count: number }
        observer: MutationObserver
        countRecords: (records: ReadonlyArray<MutationRecord>) => void
      }
    }).__wseffectMutationRecorder
    if (recorder === undefined) throw new Error('mutation recorder was not started')
    recorder.countRecords(recorder.observer.takeRecords())
    recorder.observer.disconnect()
    return recorder.state.count
  })
}
