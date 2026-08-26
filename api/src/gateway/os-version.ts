/**
 * Android OS version normalization.
 *
 * Older app builds only ever sent `os = Build.VERSION.BASE_OS`, a raw build
 * fingerprint, and never sent an OS version at all. Many installs still run
 * those builds and may never update, so the release is derived here rather
 * than relying on the client to report it.
 *
 * Keep FINGERPRINT_RELEASE and BUILD_ID_RELEASE in sync with the copies in
 * textbee-tools/src/textbee_tools/backfill_os_version.py
 */

/** Matches the release in a BASE_OS fingerprint: samsung/a13nnxx/a13:14/UP1A.../... */
const FINGERPRINT_RELEASE = /:(\d+(?:\.\d+)*)\//

/**
 * Leading letter of Build.ID mapped to the Android release.
 *
 * Only letters that resolve to a single release are listed. Measured against
 * devices where the release was already known from a fingerprint, each of
 * these was at least 99% consistent.
 *
 * Deliberately absent:
 *  - R  Samsung's legacy R16NW builds are Android 8, not 11, and even the
 *       AOSP-shaped RKQ1 builds only agree about three quarters of the time.
 *  - H  Huawei and Honor vendor ids carry no usable release signal.
 *  - M  conflicts with the AOSP convention on a small sample.
 */
/**
 * Android build ids are uppercase alphanumeric, either AOSP shaped
 * (TP1A.220624.014) or a legacy token (NRD90M). Requiring that shape keeps the
 * leading-letter lookup from firing on arbitrary vendor or client strings that
 * merely happen to start with a mapped letter.
 */
const BUILD_ID_SHAPE = /^[A-Z][A-Z0-9]{2,}[A-Z0-9._-]*$/

const BUILD_ID_RELEASE: Record<string, string> = {
  N: '7',
  O: '8',
  P: '9',
  Q: '10',
  S: '12',
  T: '13',
  U: '14',
  A: '15',
  V: '15',
  B: '16',
  W: '16',
  C: '17',
}

/**
 * How the stored release was arrived at. `reported` and `fingerprint` are
 * measured, `buildId` is inferred, so a weaker source must never overwrite a
 * stronger one.
 */
export type OsVersionSource = 'reported' | 'fingerprint' | 'buildId'

const SOURCE_RANK: Record<OsVersionSource, number> = {
  buildId: 1,
  fingerprint: 2,
  reported: 3,
}

export interface OsFieldsInput {
  os?: string
  osVersion?: string
  osApiLevel?: number
  osBuildFingerprint?: string
  buildId?: string
  osVersionSource?: string
}

export function parseReleaseFromFingerprint(raw?: string): string | null {
  if (!raw) return null
  return raw.match(FINGERPRINT_RELEASE)?.[1] ?? null
}

/**
 * Infers the release from Build.ID. Weaker than the other two sources: it maps
 * a build's leading letter to a release rather than reading a release out of
 * the string, so it is only used when nothing better is available.
 */
export function parseReleaseFromBuildId(raw?: string): string | null {
  const trimmed = raw?.trim()
  if (!trimmed || !BUILD_ID_SHAPE.test(trimmed)) return null
  return BUILD_ID_RELEASE[trimmed[0]] ?? null
}

function isSource(value?: string): value is OsVersionSource {
  return !!value && value in SOURCE_RANK
}

/** Best release the payload supports, strongest source first. */
function deriveOsVersion(
  input: OsFieldsInput,
): { version: string; source: OsVersionSource } | null {
  const reported = input?.osVersion?.trim()
  if (reported) {
    // Re-normalizing our own output must not relabel a derived value as
    // reported, so an explicit source on the way in wins.
    const carried = input?.osVersionSource?.trim()
    return {
      version: reported,
      source: isSource(carried) ? carried : 'reported',
    }
  }

  const fromFingerprint = parseReleaseFromFingerprint(
    input?.osBuildFingerprint?.trim() || input?.os?.trim(),
  )
  if (fromFingerprint) return { version: fromFingerprint, source: 'fingerprint' }

  const fromBuildId = parseReleaseFromBuildId(input?.buildId)
  if (fromBuildId) return { version: fromBuildId, source: 'buildId' }

  return null
}

/**
 * Returns only the keys we have a real value for, so a partial or legacy
 * payload can never overwrite a stored value with '' or null.
 *
 * `storedSource` is the provenance already on the device, if any. It stops an
 * inferred release from overwriting one we actually measured. `storedOsVersion`
 * is the already-stored osVersion value; when present alongside a missing
 * storedSource (legacy device with no provenance tracking), buildId-derived
 * values are rejected to avoid downgrading trustworthy legacy data.
 */
export function normalizeOsFields(
  input: OsFieldsInput,
  storedSource?: string,
  storedOsVersion?: string,
): Record<string, any> {
  const patch: Record<string, any> = {}
  const raw = input?.os?.trim()

  const derived = deriveOsVersion(input)
  if (derived) {
    const stored = isSource(storedSource) ? SOURCE_RANK[storedSource] : 0

    // Legacy device protection: if a stored osVersion exists but storedSource
    // is missing (device predates provenance tracking), reject buildId-only
    // derivations to avoid replacing a trustworthy legacy value with a weak guess.
    const isLegacyDevice = !storedSource && !!storedOsVersion
    const isBuildIdDerived = derived.source === 'buildId'

    if (SOURCE_RANK[derived.source] >= stored && !(isLegacyDevice && isBuildIdDerived)) {
      patch.osVersion = derived.version
      patch.osVersionSource = derived.source
    }
  }

  if (typeof input?.osApiLevel === 'number' && Number.isFinite(input.osApiLevel)) {
    patch.osApiLevel = input.osApiLevel
  }

  // Current clients send the build string in its own field, since `os` now
  // carries the plain 'Android' label. Older clients only ever put it in `os`.
  const reportedFingerprint = input?.osBuildFingerprint?.trim()
  if (reportedFingerprint) {
    patch.osBuildFingerprint = reportedFingerprint
  } else if (raw && raw.includes('/')) {
    patch.osBuildFingerprint = raw
  }

  if (input?.os !== undefined) patch.os = 'Android'

  return patch
}
