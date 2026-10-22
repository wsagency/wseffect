import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { test } from 'node:test'
import { captureBounds, captureTarget } from './capture-target.ts'

test('target crop includes visible portal content outside the target subtree', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 200, height: 120 } })
    await page.setContent('<div data-sp2-capture-target style="position:fixed;left:20px;top:20px;width:100px;height:80px;background:white"></div><div data-sp2-portal class="rt-PopperContent" style="position:fixed;left:130px;top:40px;width:30px;height:20px;background:rgb(255,0,0);z-index:1000"></div>')
    const withPortalBounds = await captureBounds(page)
    assert.deepEqual(withPortalBounds, { x: 20, y: 20, width: 140, height: 80 })
    const withPortal = await captureTarget(page, withPortalBounds)
    await page.locator('[data-sp2-portal]').evaluate(element => element.remove())
    const withoutPortalBounds = await captureBounds(page)
    assert.deepEqual(withoutPortalBounds, { x: 20, y: 20, width: 100, height: 80 })
    const withoutPortal = await captureTarget(page, withoutPortalBounds)
    assert.notDeepEqual(withPortal, withoutPortal)
  } finally {
    await browser.close()
  }
})
