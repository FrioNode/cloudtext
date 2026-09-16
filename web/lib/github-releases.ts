import { ExternalLinks } from '@/config/external-links'

// Single source of truth for the repo, derived from the configured GitHub URL
// (ExternalLinks.github = "https://github.com/frionode/cloudtext").
const REPO_PATH = ExternalLinks.github
  .replace(/^https?:\/\/github\.com\//i, '')
  .replace(/\/+$/, '')

const RELEASES_ENDPOINT = `https://api.github.com/repos/${REPO_PATH}/releases?per_page=20`

// How long (in seconds) a fetched release list is cached before Next.js
// re-fetches it. ~10 minutes keeps the page fresh without ever approaching
// GitHub's unauthenticated rate limit (60 req/hr -> at most ~6 req/hr here).
export const RELEASES_REVALIDATE_SECONDS = 600

// How many releases to surface on the download page.
export const MAX_RELEASES = 5

export interface AppRelease {
  /** Git tag, e.g. "version_1_blue". */
  tag: string
  /** Human-facing title (release name, falling back to the tag). */
  name: string
  /** ISO timestamp of publication, or null when unknown. */
  publishedAt: string | null
  /** Direct link to the .apk asset, or null if the release ships no APK. */
  apkUrl: string | null
  /** APK size in bytes, when known. */
  apkSize: number | null
  /** Total downloads recorded for the APK asset. */
  downloads: number
  /** Link to the release page on GitHub. */
  releaseUrl: string
}

// Shown only if the GitHub API is unreachable or rate-limited, so the page
// always offers a working download instead of an empty state.
const FALLBACK_RELEASES: AppRelease[] = [
  {
    tag: 'latest',
    name: 'Cloud Text',
    publishedAt: null,
    apkUrl: `${ExternalLinks.github}/releases/latest`,
    apkSize: null,
    downloads: 0,
    releaseUrl: `${ExternalLinks.github}/releases`,
  },
]

interface GitHubAsset {
  name: string
  browser_download_url: string
  size: number
  download_count: number
}

interface GitHubRelease {
  tag_name: string
  name: string | null
  published_at: string | null
  draft: boolean
  html_url: string
  assets: GitHubAsset[]
}

function toAppRelease(release: GitHubRelease): AppRelease {
  const apk = release.assets.find((asset) =>
    asset.name.toLowerCase().endsWith('.apk')
  )
  return {
    tag: release.tag_name,
    name: release.name?.trim() || release.tag_name,
    publishedAt: release.published_at,
    apkUrl: apk?.browser_download_url ?? null,
    apkSize: apk?.size ?? null,
    downloads: apk?.download_count ?? 0,
    releaseUrl: release.html_url,
  }
}

/**
 * Fetches the most recent releases (newest first) that ship an APK, capped at
 * {@link MAX_RELEASES}. The result is cached and revalidated every
 * {@link RELEASES_REVALIDATE_SECONDS} seconds, so publishing a new GitHub
 * release updates the download page automatically — no code changes needed.
 *
 * Falls back to a single hardcoded entry if the GitHub API cannot be reached,
 * so the download page is never empty.
 */
export async function getAppReleases(): Promise<AppRelease[]> {
  try {
    // Optional: a GITHUB_TOKEN raises the rate limit to 5000 req/hr. Not
    // required at this traffic — anonymous access is plenty with caching.
    const token = process.env.GITHUB_TOKEN
    const response = await fetch(RELEASES_ENDPOINT, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      next: { revalidate: RELEASES_REVALIDATE_SECONDS },
    })

    if (!response.ok) {
      throw new Error(`GitHub releases API returned ${response.status}`)
    }

    const data = (await response.json()) as GitHubRelease[]
    const releases = data
      .filter((release) => !release.draft) // never surface unpublished drafts
      .map(toAppRelease)
      .filter((release) => release.apkUrl) // only releases that ship an APK
      .slice(0, MAX_RELEASES)

    return releases.length > 0 ? releases : FALLBACK_RELEASES
  } catch (error) {
    console.error('[download] failed to load GitHub releases:', error)
    return FALLBACK_RELEASES
  }
}

/** Formats a byte count as a compact size string, e.g. "12.4 MB". */
export function formatBytes(bytes: number | null): string | null {
  if (bytes == null || bytes <= 0) return null
  const megabytes = bytes / (1024 * 1024)
  if (megabytes >= 1) return `${megabytes.toFixed(1)} MB`
  return `${Math.round(bytes / 1024)} KB`
}
