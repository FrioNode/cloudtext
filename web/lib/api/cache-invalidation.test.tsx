import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { QueryClient } from '@tanstack/react-query'
import { server } from '@/test/msw/server'
import { TestProviders } from '@/test/render'
import { API_BASE_URL, mockUser } from '@/test/fixtures'
import { ApiEndpoints } from '@/config/api'
import { queryKeys } from './query-keys'
import { useSendSms } from './hooks'
import VerifyEmailAlert from '@/app/(app)/dashboard/(components)/alerts/verify-email-alert'
import GenerateApiKey from '@/app/(app)/dashboard/(components)/api-keys/generate-api-key'
import { useBulkSend } from '@/app/(app)/dashboard/(components)/bulk-send/use-bulk-send'

const url = (path: string) => `${API_BASE_URL}${path.split('?')[0]}`

/**
 * These cover cache bugs that are invisible on inspection: the code looks
 * correct at every individual call site, and only the relationship between
 * sites is wrong. Both shipped to production.
 */
describe('cache invalidation', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    // Not makeTestQueryClient: it sets gcTime 0, which collects any cache
    // entry the moment it has no observer, so priming a cache to assert it
    // gets invalidated would never survive to be asserted on.
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  })

  const renderWith = (ui: React.ReactElement) =>
    render(<TestProviders queryClient={queryClient}>{ui}</TestProviders>)

  // /auth/who-am-i used to be cached under two keys, ['whoAmI'] and
  // ['currentUser'], so invalidating one left the other serving stale data.
  // A user who verified their email still saw the "verify your email" banner,
  // because the code that refreshed the user used the other key.
  it('one invalidation refreshes every consumer of the current user', async () => {
    let verified = false
    server.use(
      http.get(url(ApiEndpoints.auth.whoAmI()), () =>
        HttpResponse.json({
          data: {
            ...mockUser,
            emailVerifiedAt: verified ? new Date().toISOString() : null,
          },
        })
      )
    )

    const { container } = renderWith(<VerifyEmailAlert />)
    // Selected by href, not by label: the banner picks its CTA text at random
    // from five variants, so a text matcher here would be flaky.
    const banner = () => container.querySelector('a[href="/verify-email"]')

    // Unverified: the banner is up.
    await waitFor(() => expect(banner()).toBeInTheDocument())

    // The user verifies elsewhere, and something invalidates the user query
    // using the canonical key.
    verified = true
    await queryClient.invalidateQueries({ queryKey: queryKeys.currentUser })

    // The banner must notice. Under the two-key split it never did.
    await waitFor(() => expect(banner()).toBeNull())
  })

  // The generate handler invalidated ['apiKeys', 'stats'], a key no query uses.
  // react-query matches by prefix, so it matched neither the key list
  // (['apiKeys', 'active']) nor the dashboard stats (['stats']): generating a
  // key refreshed nothing at all.
  it('generating an API key refreshes both the key list and the stats', async () => {
    server.use(
      http.post(url(ApiEndpoints.auth.generateApiKey()), () =>
        HttpResponse.json({ data: 'new-api-key' })
      )
    )

    // Prime the two caches a new key must invalidate.
    queryClient.setQueryData(queryKeys.apiKeys('active'), { data: [] })
    queryClient.setQueryData(queryKeys.stats, { totalApiKeyCount: 0 })

    renderWith(<GenerateApiKey />)

    // The trigger and the dialog's confirm button carry the same label, so the
    // confirm has to be scoped to the dialog.
    await userEvent.click(
      screen.getByRole('button', { name: /Generate API Key/i })
    )
    const confirmDialog = await screen.findByRole('dialog', {
      name: /Create new API Key/i,
    })
    await userEvent.click(
      within(confirmDialog).getByRole('button', { name: /Generate API Key/i })
    )

    await waitFor(() => {
      expect(
        queryClient.getQueryState(queryKeys.apiKeys('active'))?.isInvalidated,
        'the API key list must be invalidated'
      ).toBe(true)
      expect(
        queryClient.getQueryState(queryKeys.stats)?.isInvalidated,
        'the dashboard stats must be invalidated'
      ).toBe(true)
    })
  })

  // Regression for #261. useSendSms and the bulk sender invalidated nothing, so
  // a sent message never appeared in the history behind the composer and the
  // quota bar sat still: with staleTime 60s and refetchOnWindowFocus off,
  // nothing corrected them for a minute.
  const deviceId = 'device-1'

  // Primed under the filtered keys the message list actually uses, so this
  // also covers the prefix match: messagesAll has to reach every selection,
  // including the 'all devices' view, which does not key on the sending
  // device at all.
  const primeSendCaches = (queryClient: QueryClient) => {
    queryClient.setQueryData(
      queryKeys.deviceMessages(deviceId, { type: 'all', page: 1, limit: 20 }),
      { data: [] }
    )
    queryClient.setQueryData(
      queryKeys.deviceMessages('all', { type: 'all', page: 1, limit: 20 }),
      { data: [] }
    )
    queryClient.setQueryData(queryKeys.stats, { sentSMSCount: 0 })
    queryClient.setQueryData(queryKeys.subscription, { usage: {} })
  }

  // Asserted on the keys handed to invalidateQueries rather than on
  // state.isInvalidated: a key with a live observer refetches immediately and
  // clears its own invalidated flag, so the flag is only readable for keys
  // nothing is currently watching (useBulkSend watches the subscription).
  const recordInvalidations = (queryClient: QueryClient) => {
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    return () =>
      spy.mock.calls.map(([filters]) => JSON.stringify(filters?.queryKey))
  }

  const expectSendKeysInvalidated = (invalidatedKeys: () => string[]) =>
    waitFor(() => {
      const keys = invalidatedKeys()
      expect(keys, 'the message list must be invalidated').toContain(
        JSON.stringify(queryKeys.messagesAll)
      )
      expect(keys, 'the dashboard stats must be invalidated').toContain(
        JSON.stringify(queryKeys.stats)
      )
      expect(keys, 'the subscription quota must be invalidated').toContain(
        JSON.stringify(queryKeys.subscription)
      )
    })

  const hookWrapper = (queryClient: QueryClient) => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestProviders queryClient={queryClient}>{children}</TestProviders>
    )
    Wrapper.displayName = 'HookWrapper'
    return Wrapper
  }

  it('sending an SMS refreshes the message list, the stats and the quota', async () => {
    server.use(
      http.post(url(ApiEndpoints.gateway.sendSMS()), () =>
        HttpResponse.json({ data: { success: true } })
      )
    )

    primeSendCaches(queryClient)
    const invalidatedKeys = recordInvalidations(queryClient)

    const { result } = renderHook(() => useSendSms(), {
      wrapper: hookWrapper(queryClient),
    })

    act(() => {
      result.current.mutate({
        deviceId,
        recipients: ['+12025550100'],
        message: 'hi',
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await expectSendKeysInvalidated(invalidatedKeys)

    // Nothing observes the message list here, so its flag survives to be read:
    // proof the messages prefix reaches the filtered entries the list caches
    // under, whichever device selection is active.
    expect(
      queryClient.getQueryState(
        queryKeys.deviceMessages(deviceId, { type: 'all', page: 1, limit: 20 })
      )?.isInvalidated
    ).toBe(true)
    expect(
      queryClient.getQueryState(
        queryKeys.deviceMessages('all', { type: 'all', page: 1, limit: 20 })
      )?.isInvalidated
    ).toBe(true)
  })

  it('a bulk send refreshes the same caches as a single send', async () => {
    server.use(
      http.post(url(ApiEndpoints.gateway.sendBulkSMS()), () =>
        HttpResponse.json({ data: { success: true } })
      )
    )

    primeSendCaches(queryClient)
    const invalidatedKeys = recordInvalidations(queryClient)

    const { result } = renderHook(() => useBulkSend(), {
      wrapper: hookWrapper(queryClient),
    })

    act(() => result.current.setDeviceId(deviceId))
    act(() => result.current.sendBulk())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await expectSendKeysInvalidated(invalidatedKeys)
  })
})
