import { ExternalLinks } from '@/config/external-links'

export const DISCORD_STORAGE_KEYS = {
  LAST_SHOWN: 'discord_modal_last_shown',
  HAS_JOINED: 'discord_modal_has_joined',
  BANNER_DISMISSED: 'discord_banner_dismissed',
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Private browsing or a full quota, nothing to recover from here.
  }
}

export function safeGetDiscordFlag(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** Suppresses every Discord prompt once the user has taken the link. */
export function markDiscordJoined() {
  safeSet(DISCORD_STORAGE_KEYS.HAS_JOINED, 'true')
}

export function dismissDiscordBanner() {
  safeSet(DISCORD_STORAGE_KEYS.BANNER_DISMISSED, '1')
}

export function recordDiscordModalShown() {
  safeSet(DISCORD_STORAGE_KEYS.LAST_SHOWN, Date.now().toString())
}

export function openDiscordInvite() {
  window.open(ExternalLinks.discord, '_blank', 'noopener,noreferrer')
  markDiscordJoined()
}
