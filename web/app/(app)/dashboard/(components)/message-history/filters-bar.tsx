'use client'

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronDown, RefreshCw, Search, Smartphone, Timer, X } from 'lucide-react'
import { formatDeviceName, cn } from '@/lib/utils'
import type { Device } from '@/lib/api'

const AUTO_REFRESH_INTERVALS = [
  { value: 0, label: 'Off' },
  { value: 15, label: 'Every 15s' },
  { value: 30, label: 'Every 30s' },
  { value: 60, label: 'Every 60s' },
]

const TYPES = [
  { value: 'all', label: 'All' },
  { value: 'sent', label: 'Sent' },
  { value: 'received', label: 'Received' },
]

type FiltersBarProps = {
  devices: Device[]
  // Empty selection means all devices.
  selectedDeviceIds: string[]
  onDeviceSelectionChange: (deviceIds: string[]) => void
  messageType: string
  onMessageTypeChange: (type: string) => void
  search: string
  onSearchChange: (value: string) => void
  onRefresh: () => void
  isRefreshing: boolean
  autoRefreshInterval: number
  onAutoRefreshIntervalChange: (seconds: number) => void
}

// Collapsed from a tall labelled card into one compact bar, so messages are
// visible without scrolling past the controls.
export default function FiltersBar({
  devices,
  selectedDeviceIds,
  onDeviceSelectionChange,
  messageType,
  onMessageTypeChange,
  search,
  onSearchChange,
  onRefresh,
  isRefreshing,
  autoRefreshInterval,
  onAutoRefreshIntervalChange,
}: FiltersBarProps) {
  const autoRefreshOn = autoRefreshInterval > 0
  const allSelected = selectedDeviceIds.length === 0

  const deviceLabel = allSelected
    ? 'All devices'
    : selectedDeviceIds.length === 1
      ? formatDeviceName(
          devices.find((d) => d._id === selectedDeviceIds[0]) ?? devices[0]
        )
      : `${selectedDeviceIds.length} devices`

  // Checked always means included: with the all-devices scope active every
  // device renders checked, and unchecking one narrows to the rest.
  const isDeviceSelected = (deviceId: string) =>
    allSelected || selectedDeviceIds.includes(deviceId)

  const toggleDevice = (deviceId: string, checked: boolean) => {
    const next = allSelected
      ? devices.filter((d) => d._id !== deviceId).map((d) => d._id)
      : checked
        ? [...selectedDeviceIds, deviceId]
        : selectedDeviceIds.filter((id) => id !== deviceId)
    // Selecting every device manually is the same thing as all devices;
    // collapse to the empty selection so new devices stay included.
    onDeviceSelectionChange(next.length === devices.length ? [] : next)
  }

  return (
    <div className='space-y-3'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
        <div className='relative flex-1 sm:max-w-sm'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Label htmlFor='message-search' className='sr-only'>
            Search messages
          </Label>
          <Input
            id='message-search'
            type='search'
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder='Search messages or numbers'
            className='h-9 pl-9 pr-9'
          />
          {search && (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              aria-label='Clear search'
              onClick={() => onSearchChange('')}
              className='absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2'
            >
              <X className='h-3.5 w-3.5' />
            </Button>
          )}
        </div>

        <div className='flex items-center gap-2'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type='button'
                variant='outline'
                id='history-device'
                className='h-9 w-full justify-between font-normal sm:w-64'
                aria-label={`Devices: ${deviceLabel}`}
              >
                <span className='flex min-w-0 items-center gap-2'>
                  <Smartphone className='h-4 w-4 shrink-0 text-muted-foreground' />
                  <span className='truncate'>{deviceLabel}</span>
                </span>
                <ChevronDown className='h-4 w-4 shrink-0 text-muted-foreground' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' className='w-64'>
              <DropdownMenuLabel>Devices</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={allSelected}
                onCheckedChange={() => onDeviceSelectionChange([])}
              >
                All devices
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {devices.map((device) => (
                <DropdownMenuCheckboxItem
                  key={device._id}
                  checked={isDeviceSelected(device._id)}
                  onCheckedChange={(checked) =>
                    toggleDevice(device._id, checked === true)
                  }
                >
                  {formatDeviceName(device)}
                  {!device.enabled
                    ? ' (disabled)'
                    : device.isDefault
                      ? ' (default)'
                      : ''}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type='button'
            variant='outline'
            size='icon'
            className='h-9 w-9 shrink-0'
            onClick={onRefresh}
            aria-label='Refresh messages'
          >
            <RefreshCw
              className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
            />
          </Button>

          {/* Four inline interval buttons took a whole row for a setting that
              is changed rarely. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type='button'
                variant='outline'
                size='icon'
                className={cn(
                  'h-9 w-9 shrink-0',
                  autoRefreshOn && 'text-primary'
                )}
                aria-label={
                  autoRefreshOn
                    ? `Auto refresh every ${autoRefreshInterval} seconds`
                    : 'Auto refresh off'
                }
              >
                <Timer className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuLabel>Auto refresh</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {AUTO_REFRESH_INTERVALS.map((interval) => (
                <DropdownMenuCheckboxItem
                  key={interval.value}
                  checked={autoRefreshInterval === interval.value}
                  onCheckedChange={() =>
                    onAutoRefreshIntervalChange(interval.value)
                  }
                >
                  {interval.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div
        className='flex w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1 sm:w-fit'
        role='tablist'
        aria-label='Message direction'
      >
        {TYPES.map((type) => (
          <button
            key={type.value}
            type='button'
            role='tab'
            aria-selected={messageType === type.value}
            onClick={() => onMessageTypeChange(type.value)}
            className={cn(
              'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              messageType === type.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {type.label}
          </button>
        ))}
      </div>
    </div>
  )
}
