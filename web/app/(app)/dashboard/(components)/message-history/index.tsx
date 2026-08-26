'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquare, SearchX, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDeviceMessages, useDevices } from '@/lib/api'
import FiltersBar from './filters-bar'
import Pagination from '@/components/shared/numbered-pagination'
import EmptyState from '@/components/shared/empty-state'
import SmsDetailsDialog from './sms-details-dialog'
import { MessageRow, MessageRowSkeleton } from './message-row'
import { groupMessagesByDay } from './group'
import type { MessagesPagination, SmsMessage } from './types'

const SEARCH_DEBOUNCE_MS = 300

// Container for the message-history screen: owns filter/pagination state and
// data fetching; rendering is delegated to the focused subcomponents.
export default function MessageHistory() {
  const [selectedMessage, setSelectedMessage] = useState<SmsMessage | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)

  // Empty means all devices: nothing is sent on the request, so the scope
  // stays correct when a device is added mid-session.
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([])
  const [messageType, setMessageType] = useState('all')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Two values: what is typed, and what has been committed to the query.
  // Search is server-side, so it is debounced to avoid a request per keystroke.
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchInput])

  const {
    data: devices,
    isLoading: isLoadingDevices,
    error: devicesError,
  } = useDevices()

  const {
    data: messagesResponse,
    isLoading: isLoadingMessages,
    error: messagesError,
    refetch,
  } = useDeviceMessages(selectedDeviceIds, {
    type: messageType,
    page,
    limit,
    search,
  })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
    }

    if (autoRefreshInterval > 0) {
      refreshTimerRef.current = setInterval(() => {
        refetch()
        setIsRefreshing(true)
        setTimeout(() => setIsRefreshing(false), 300)
      }, autoRefreshInterval * 1000)
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }
    }
  }, [autoRefreshInterval, refetch])

  const messages = (messagesResponse?.data ?? []) as SmsMessage[]
  const pagination: MessagesPagination = {
    page: messagesResponse?.meta?.page ?? 1,
    limit: messagesResponse?.meta?.limit ?? limit,
    total: messagesResponse?.meta?.total ?? 0,
    totalPages: messagesResponse?.meta?.totalPages ?? 1,
  }

  const days = useMemo(() => groupMessagesByDay(messages), [messages])

  // Per-message device lookup: rows can now come from different devices, and
  // the populated device on a message lacks fields like appVersionCode.
  const devicesById = useMemo(
    () => new Map((devices ?? []).map((device) => [device._id, device])),
    [devices]
  )

  // Where a reply must go when a message somehow lacks its device: the first
  // selected device, else the account default, else the first device.
  const fallbackDeviceId =
    selectedDeviceIds[0] ||
    devices?.find((device) => device.isDefault)?._id ||
    devices?.[0]?._id ||
    ''

  const handleSelectMessage = (message: SmsMessage) => {
    setSelectedMessage(message)
    setIsDetailsDialogOpen(true)
  }

  const handleDeviceSelectionChange = (deviceIds: string[]) => {
    setSelectedDeviceIds(deviceIds)
    setPage(1)
  }

  const handleMessageTypeChange = (type: string) => {
    setMessageType(type)
    setPage(1)
  }

  const clearSearch = () => setSearchInput('')

  if (isLoadingDevices)
    return (
      <div className='space-y-4'>
        <Skeleton className='h-9 w-full' />
        <div className='rounded-xl border border-border'>
          {[1, 2, 3, 4].map((i) => (
            <MessageRowSkeleton key={i} />
          ))}
        </div>
      </div>
    )

  if (devicesError)
    return (
      <div className='flex h-full items-center justify-center'>
        Error: {devicesError.message}
      </div>
    )

  if (!devices?.length)
    return (
      <EmptyState
        icon={Smartphone}
        title='No devices found'
        hint='Register a device to start sending and receiving SMS.'
      />
    )

  return (
    <div className='space-y-4'>
      <FiltersBar
        devices={devices}
        selectedDeviceIds={selectedDeviceIds}
        onDeviceSelectionChange={handleDeviceSelectionChange}
        messageType={messageType}
        onMessageTypeChange={handleMessageTypeChange}
        search={searchInput}
        onSearchChange={setSearchInput}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        autoRefreshInterval={autoRefreshInterval}
        onAutoRefreshIntervalChange={setAutoRefreshInterval}
      />

      {messagesError && (
        <div className='flex h-full items-center justify-center'>
          Error: {messagesError.message}
        </div>
      )}

      {isLoadingMessages ? (
        <div className='rounded-xl border border-border'>
          {[1, 2, 3, 4].map((i) => (
            <MessageRowSkeleton key={i} />
          ))}
        </div>
      ) : !messagesError && messages.length === 0 ? (
        // A search that found nothing is a different situation from a device
        // that has never sent a message, and needs a different way out.
        search ? (
          <div className='rounded-xl border border-border'>
            <EmptyState
              icon={SearchX}
              title={`No messages match "${search}"`}
              hint='Try a different number or wording.'
            />
            <div className='flex justify-center pb-6'>
              {/* Says what happens rather than repeating the label on the
                  input's clear icon. */}
              <Button variant='outline' size='sm' onClick={clearSearch}>
                Show all messages
              </Button>
            </div>
          </div>
        ) : (
          <div className='rounded-xl border border-border'>
            <EmptyState
              icon={MessageSquare}
              title='No messages yet'
              hint='Messages sent or received by your devices will appear here.'
            />
          </div>
        )
      ) : (
        <div className='overflow-hidden rounded-xl border border-border'>
          {days.map((day) => (
            <section key={day.key}>
              {/* Deliberately not sticky. On mobile it pinned to the same
                  offset as the sticky search bar and landed on top of message
                  rows, translucent, with text bleeding through. On desktop it
                  covered rows scrolled beneath it and swallowed their clicks.
                  A page holds 20 messages, so groups are short and a pinned
                  header bought little in exchange for that. */}
              <h3 className='border-b border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground'>
                {day.label}
              </h3>
              <div className='divide-y divide-border'>
                {day.messages.map((message) => (
                  <MessageRow
                    key={message._id}
                    message={message}
                    device={
                      devicesById.get(message.device?._id ?? '') ??
                      devicesById.get(fallbackDeviceId)
                    }
                    onSelect={handleSelectMessage}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* A single page needs no pager. */}
      {pagination.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      {selectedMessage && (
        <SmsDetailsDialog
          message={selectedMessage}
          fallbackDeviceId={fallbackDeviceId}
          open={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
        />
      )}
    </div>
  )
}
