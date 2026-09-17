'use client'

import type { PropsWithChildren } from 'react'
import { SessionProvider } from 'next-auth/react'

export default function PublicProviders({ children }: PropsWithChildren) {
  return <SessionProvider session={null}>{children}</SessionProvider>
}
