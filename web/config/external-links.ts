const POLAR_CUSTOMER_PORTAL_REQUEST_BASE =
  'https://polar.sh/textbee/portal/request'

export function polarCustomerPortalRequestUrl(
  email?: string | null
): string {
  const trimmed = email?.trim()
  if (!trimmed) return POLAR_CUSTOMER_PORTAL_REQUEST_BASE
  return `${POLAR_CUSTOMER_PORTAL_REQUEST_BASE}?email=${encodeURIComponent(trimmed)}`
}

export const ExternalLinks = {
  patreon: 'https://patreon.com/vernu',
  github: 'https://github.com/FrioNode/textbee',
  discord: 'https://cloudtext.frionode.online/discord',
  polar: 'https://cloudtext.frionode.online',
  twitter: 'https://x.com/textbeedotdev',
  linkedin: 'https://www.linkedin.com/company/textbeedotdev',
}
