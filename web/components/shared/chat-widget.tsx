'use client'

import SupportHQWidget from './support-hq-widget'
import TawkWidget from './tawk-widget'

export default function ChatWidget() {
  const provider =
    process.env.NEXT_PUBLIC_CHAT_PROVIDER?.trim().toLowerCase() ?? 'tawk'

  if (provider === 'supporthq') return <SupportHQWidget />
  return <TawkWidget />
}