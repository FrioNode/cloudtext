import { expect, test } from '@playwright/test'
import { authenticate } from './session'
import { mockApi } from './mock-api'
import { mockDevices } from '../test/fixtures'
import { buildEndpoints } from '../app/(app)/dashboard/messaging/(components)/api-guide/snippets'

// The page streams behind a loading.tsx boundary, so its HTML can paint before
// React hydrates, and a tab or copy click landing in that gap is silently
// dropped. Prism tokens are not the signal to wait on: react-syntax-highlighter
// renders its spans server-side too, so they are in the SSR payload already.
// The snippets interpolate a device id from the client-side devices fetch, so
// the real id appearing is what proves hydration effects have run.
async function gotoGuide(page: import('@playwright/test').Page) {
  await page.goto('/dashboard/messaging/api-guide')
  await expect(
    page.getByText(mockDevices[0]._id, { exact: false }).first()
  ).toBeVisible()
}

test.describe('api guide (mocked API, no real backend)', () => {
  test('shows content immediately, not a collapsed accordion', async ({
    page,
    context,
  }) => {
    await authenticate(context)
    await mockApi(page)
    await page.goto('/dashboard/messaging/api-guide')

    // The old guide rendered a collapsed panel that defaulted to closed, so
    // this dedicated page looked empty until you found the chevron.
    await expect(
      page.getByRole('heading', { name: 'Send an SMS' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Send messages in bulk' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Read received messages' })
    ).toBeVisible()
  })

  test('samples use the real device id so they are runnable', async ({
    page,
    context,
  }) => {
    await authenticate(context)
    await mockApi(page)
    await page.goto('/dashboard/messaging/api-guide')

    // Fixtures: first device id. The old guide always printed YOUR_DEVICE_ID.
    const deviceId = mockDevices[0]._id
    await expect(page.getByText(deviceId, { exact: false }).first()).toBeVisible()
    await expect(page.getByText('YOUR_DEVICE_ID')).toHaveCount(0)
  })

  test('switching language swaps every sample', async ({ page, context }) => {
    await authenticate(context)
    await mockApi(page)
    await gotoGuide(page)

    // cURL is the default.
    await expect(page.getByText('curl -X POST').first()).toBeVisible()

    await page.getByRole('tab', { name: 'Python' }).click()
    await expect(page.getByText('import os, requests').first()).toBeVisible()
    await expect(page.getByText('curl -X POST')).toHaveCount(0)

    await page.getByRole('tab', { name: 'Go' }).click()
    await expect(page.getByText('package main').first()).toBeVisible()
  })

  // The guide applies Prism themes, so it must render with the Prism
  // highlighter. It previously used the package's default export, which is the
  // highlight.js build: that emits hljs-* classes the Prism theme never styles
  // (so samples went uncoloured) and compiles in every language it supports.
  test('samples are highlighted by Prism, in every language', async ({
    page,
    context,
  }) => {
    await authenticate(context)
    await mockApi(page)
    await page.goto('/dashboard/messaging/api-guide')

    for (const language of ['cURL', 'Node.js', 'Python', 'PHP', 'Go']) {
      await page.getByRole('tab', { name: language, exact: true }).click()
      await expect(
        page.locator('pre code .token').first(),
        `${language} samples must carry Prism token markup`
      ).toBeVisible()
    }

    // A registered language yields more than one token type; a missing one
    // would fall back to a single undifferentiated text run.
    expect(
      await page.locator('pre code .token').count()
    ).toBeGreaterThan(5)
  })

  test('code can be copied', async ({ page, context }) => {
    await authenticate(context)
    await mockApi(page)
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await gotoGuide(page)
    // navigator.clipboard.writeText rejects when the document is not focused,
    // which is the state a backgrounded page sits in while workers run in
    // parallel. Granting permissions alone does not cover it.
    await page.bringToFront()

    // The page's first Copy code button belongs to the Base URL chip, so the
    // click has to be scoped to the send-sms sample it is asserting on.
    await page
      .locator('#send-sms')
      .getByRole('button', { name: 'Copy code' })
      .click()

    // Assert on the clipboard, not on the button's "Copied" label. That label
    // clears itself two seconds after the click (code-block.tsx setTimeout), so
    // waiting for it races a window narrow enough to miss on a loaded runner.
    // The clipboard content is the behaviour under test and it does not expire.
    const expectedCurl = buildEndpoints(mockDevices[0]._id).find(
      (endpoint) => endpoint.id === 'send-sms'
    )!.samples.curl
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(expectedCurl)
  })

  test('does not scroll sideways at 375px', async ({ page, context }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await authenticate(context)
    await mockApi(page)
    await page.goto('/dashboard/messaging/api-guide')
    // Not networkidle: link prefetching keeps the network busy, so that state
    // can go unreached under parallel workers. A rendered sample proves the
    // code blocks (the thing that would widen the page) are laid out.
    await expect(page.getByText('curl -X POST').first()).toBeVisible()

    // Code blocks are the classic way to widen a mobile page.
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
  })
})
