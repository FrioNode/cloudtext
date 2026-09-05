'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'

type TawkApi = {
  onLoad?: () => void
  setAttributes?: (
    attributes: Record<string, string>,
    callback?: (error?: Error) => void
  ) => void
  hideWidget?: () => void
  visitor?: { name?: string; email?: string }
}

declare global {
  interface Window {
    Tawk_API?: TawkApi
  }
}

const scriptId = 'tawkto-widget-script'

export default function TawkWidget() {
  const { data: session } = useSession()
  const embedUrl = process.env.NEXT_PUBLIC_TAWKTO_EMBED_URL?.trim()
  const userId = session?.user?.id ?? ''
  const name = session?.user?.name ?? ''
  const email = session?.user?.email ?? ''
  const phone = session?.user?.phone ?? ''
  const hasUser = Boolean(session?.user)
  const visitorRef = useRef({ hasUser, userId, name, email, phone })

  useEffect(() => {
    visitorRef.current = { hasUser, userId, name, email, phone }
  }, [email, hasUser, name, phone, userId])

  useEffect(() => {
    if (!embedUrl || document.getElementById(scriptId)) return

    const applyVisitor = () => {
      const visitor = visitorRef.current
      if (!visitor.hasUser || !window.Tawk_API) return

      window.Tawk_API.visitor = {
        name: visitor.name || undefined,
        email: visitor.email || undefined,
      }
      window.Tawk_API.setAttributes?.({
        userId: visitor.userId,
        name: visitor.name,
        email: visitor.email,
        phone: visitor.phone,
      })
    }

    window.Tawk_API = window.Tawk_API ?? {}
    window.Tawk_API.onLoad = applyVisitor

    const script = document.createElement('script')
    script.id = scriptId
    script.src = embedUrl
    script.async = true
    script.onload = applyVisitor
    document.body.appendChild(script)

    return () => {
      window.Tawk_API?.hideWidget?.()
      script.remove()
    }
  }, [embedUrl])

  useEffect(() => {
    if (!embedUrl || !hasUser || !window.Tawk_API) return

    window.Tawk_API.visitor = {
      name: name || undefined,
      email: email || undefined,
    }
    window.Tawk_API.setAttributes?.({
      userId,
      name,
      email,
      phone,
    })
  }, [email, embedUrl, hasUser, name, phone, userId])

  return null
}