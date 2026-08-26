import {
  normalizeOsFields,
  parseReleaseFromBuildId,
  parseReleaseFromFingerprint,
} from './os-version'

// Representative BASE_OS fingerprints. These are shared OEM build strings,
// identical across every device on the same build.
const FP_14 = 'samsung/a13nnxx/a13:14/UP1A.231005.007/A135FXXUAEXL2:user/release-keys'
const FP_16 = 'samsung/e3qxxx/e3q:16/BP2A.250605.031.A3/S928BXXU4CYI7:user/release-keys'
const FP_15 = 'Redmi/gale_in/gale:15/AP3A.240905.015.A2/OS2.0.206.0.VGPINXM:user/release-keys'
const FP_7 = 'samsung/j5ylte/j5y17lte:7.0/NRD90M/J530FXXU1AQG3:user/release-keys'

describe('parseReleaseFromFingerprint', () => {
  it('pulls the release out of a fingerprint', () => {
    expect(parseReleaseFromFingerprint(FP_14)).toBe('14')
    expect(parseReleaseFromFingerprint(FP_16)).toBe('16')
    expect(parseReleaseFromFingerprint(FP_15)).toBe('15')
  })

  it('keeps a dotted release verbatim', () => {
    expect(parseReleaseFromFingerprint(FP_7)).toBe('7.0')
  })

  it('returns null when there is nothing to parse', () => {
    expect(parseReleaseFromFingerprint('')).toBeNull()
    expect(parseReleaseFromFingerprint(undefined)).toBeNull()
    expect(parseReleaseFromFingerprint('Android')).toBeNull()
    expect(parseReleaseFromFingerprint('not/a/fingerprint')).toBeNull()
  })

  it('takes the first match, not a later colon segment', () => {
    // ':user/' trails every fingerprint and must never win.
    expect(parseReleaseFromFingerprint(FP_14)).toBe('14')
  })
})

describe('normalizeOsFields', () => {
  describe('legacy clients (os = BASE_OS, no osVersion)', () => {
    it('derives the version from the fingerprint and canonicalizes os', () => {
      expect(normalizeOsFields({ os: FP_14 })).toEqual({
        osVersion: '14',
        osVersionSource: 'fingerprint',
        osBuildFingerprint: FP_14,
        os: 'Android',
      })
    })

    it('keeps a dotted release verbatim', () => {
      expect(normalizeOsFields({ os: FP_7 }).osVersion).toBe('7.0')
    })

    // The regression that would silently undo the backfill: BASE_OS is an
    // empty string on many devices, and an empty string is not null, so it
    // reaches $set unless it is dropped here.
    it('emits no osVersion key when BASE_OS is blank', () => {
      const patch = normalizeOsFields({ os: '' })
      expect(patch).not.toHaveProperty('osVersion')
      expect(patch).not.toHaveProperty('osBuildFingerprint')
      expect(patch.os).toBe('Android')
    })

    it('emits no osVersion key when os is absent entirely', () => {
      expect(normalizeOsFields({})).toEqual({})
    })
  })

  describe('current clients (osVersion reported directly)', () => {
    it('passes the reported version and api level through', () => {
      expect(normalizeOsFields({ os: 'Android', osVersion: '16', osApiLevel: 36 })).toEqual({
        osVersion: '16',
        osVersionSource: 'reported',
        osApiLevel: 36,
        os: 'Android',
      })
    })

    it('prefers the reported version over the fingerprint', () => {
      // A device that upgraded its OS but kept a stale BASE_OS string.
      const patch = normalizeOsFields({ os: FP_14, osVersion: '16', osApiLevel: 36 })
      expect(patch.osVersion).toBe('16')
      expect(patch.osBuildFingerprint).toBe(FP_14)
    })

    it('stores a non-numeric release as reported', () => {
      // Preview builds can report a codename; display handles it via osApiLevel.
      expect(normalizeOsFields({ osVersion: 'Baklava', osApiLevel: 36 })).toEqual({
        osVersion: 'Baklava',
        osVersionSource: 'reported',
        osApiLevel: 36,
      })
    })

    // Current clients put the build string in its own field, because `os` now
    // carries the plain 'Android' label and so has no '/' to parse. Without
    // this the field is only ever writable by the backfill script.
    it('keeps the build string reported in its own field', () => {
      expect(
        normalizeOsFields({
          os: 'Android',
          osVersion: '16',
          osApiLevel: 36,
          osBuildFingerprint: FP_16,
        }),
      ).toEqual({
        osVersion: '16',
        osVersionSource: 'reported',
        osApiLevel: 36,
        osBuildFingerprint: FP_16,
        os: 'Android',
      })
    })

    it('prefers the reported build string over one parsed out of os', () => {
      const patch = normalizeOsFields({ os: FP_14, osBuildFingerprint: FP_16 })
      expect(patch.osBuildFingerprint).toBe(FP_16)
    })

    it('emits no build string when the reported one is blank', () => {
      // BASE_OS is empty on many devices, and '' is not null, so it would
      // otherwise reach $set.
      for (const blank of ['', '   ']) {
        const patch = normalizeOsFields({ os: 'Android', osBuildFingerprint: blank })
        expect(patch).not.toHaveProperty('osBuildFingerprint')
      }
    })

    it('falls back to os when no build string is reported', () => {
      expect(normalizeOsFields({ os: FP_14 }).osBuildFingerprint).toBe(FP_14)
    })
  })

  describe('build id fallback (clients that send neither a version nor a fingerprint)', () => {
    it.each([
      ['NRD90M', '7'],
      ['OPM1.171019.026', '8'],
      ['PKQ1.180716.001', '9'],
      ['QP1A.190711.020', '10'],
      ['SP1A.210812.016', '12'],
      ['TKQ1.220829.002', '13'],
      ['UQ1A.240105.004', '14'],
      ['AP3A.240905.015.A2', '15'],
      ['BP2A.250605.031.A3', '16'],
      ['CP1A.260405.005', '17'],
    ])('maps %s to Android %s', (buildId, release) => {
      expect(parseReleaseFromBuildId(buildId)).toBe(release)
    })

    it.each([
      ['R16NW'], // Samsung legacy, actually Android 8 rather than 11
      ['RKQ1.201217.002'], // AOSP-shaped R, only ~74% consistent
      ['HUAWEI_BUILD'], // Huawei and Honor carry no usable signal
      ['MRA58K'], // conflicts with the AOSP convention on our data
      ['6.0.1'],
      [''],
    ])('declines to guess for %s', (buildId) => {
      expect(parseReleaseFromBuildId(buildId)).toBeNull()
    })

    it('derives the version and records it as inferred', () => {
      expect(normalizeOsFields({ os: '', buildId: 'TP1A.220624.014' })).toMatchObject({
        osVersion: '13',
        osVersionSource: 'buildId',
      })
    })

    it('emits nothing when the build id is not mappable', () => {
      const patch = normalizeOsFields({ os: '', buildId: 'R16NW' })
      expect(patch).not.toHaveProperty('osVersion')
      expect(patch).not.toHaveProperty('osVersionSource')
    })
  })

  describe('source precedence', () => {
    it('prefers a reported version over both derivations', () => {
      const patch = normalizeOsFields({
        os: 'Android',
        osVersion: '16',
        osBuildFingerprint: FP_14,
        buildId: 'TP1A.220624.014',
      })
      expect(patch).toMatchObject({ osVersion: '16', osVersionSource: 'reported' })
    })

    it('prefers a fingerprint over a build id', () => {
      const patch = normalizeOsFields({ os: FP_14, buildId: 'BP2A.250605.031.A3' })
      expect(patch).toMatchObject({ osVersion: '14', osVersionSource: 'fingerprint' })
    })

    // An inferred release must never replace one we actually measured.
    it.each([
      ['reported', 'BP2A.250605.031.A3'],
      ['fingerprint', 'BP2A.250605.031.A3'],
    ])('does not let a build id overwrite a %s version', (storedSource, buildId) => {
      const patch = normalizeOsFields({ os: '', buildId }, storedSource)
      expect(patch).not.toHaveProperty('osVersion')
      expect(patch).not.toHaveProperty('osVersionSource')
    })

    it('lets a build id replace an existing build id guess', () => {
      const patch = normalizeOsFields({ os: '', buildId: 'BP2A.250605.031.A3' }, 'buildId')
      expect(patch).toMatchObject({ osVersion: '16', osVersionSource: 'buildId' })
    })

    it('lets a reported version replace an inferred one', () => {
      const patch = normalizeOsFields({ os: 'Android', osVersion: '16' }, 'buildId')
      expect(patch).toMatchObject({ osVersion: '16', osVersionSource: 'reported' })
    })

    // registerDevice hands its own normalized output to updateDevice, which
    // normalizes again. Without this the provenance would be relabelled.
    it('is idempotent: re-normalizing its own output keeps the source', () => {
      const first = normalizeOsFields({ os: '', buildId: 'TP1A.220624.014' })
      const second = normalizeOsFields(first)
      expect(second).toMatchObject({ osVersion: '13', osVersionSource: 'buildId' })
    })
  })

  describe('legacy device protection (Finding 2 regression tests)', () => {
    // Legacy devices have a stored osVersion but no osVersionSource (predates
    // provenance tracking). A buildId-only derivation must NOT replace that
    // stored value, as the legacy value might have been directly reported/reliable.
    it('rejects buildId-derived replacement when stored osVersion exists but source is missing', () => {
      const patch = normalizeOsFields(
        { os: '', buildId: 'TP1A.220624.014' },
        undefined,
        '14',
      )
      expect(patch).not.toHaveProperty('osVersion')
      expect(patch).not.toHaveProperty('osVersionSource')
    })

    it('accepts fingerprint-derived replacement for legacy device with no source', () => {
      const patch = normalizeOsFields(
        { os: FP_16 },
        undefined,
        '14',
      )
      expect(patch).toMatchObject({ osVersion: '16', osVersionSource: 'fingerprint' })
    })

    it('accepts reported replacement for legacy device with no source', () => {
      const patch = normalizeOsFields(
        { os: 'Android', osVersion: '16' },
        undefined,
        '14',
      )
      expect(patch).toMatchObject({ osVersion: '16', osVersionSource: 'reported' })
    })

    it('accepts buildId-derived value when device has neither stored osVersion nor source', () => {
      const patch = normalizeOsFields(
        { os: '', buildId: 'TP1A.220624.014' },
        undefined,
        undefined,
      )
      expect(patch).toMatchObject({ osVersion: '13', osVersionSource: 'buildId' })
    })

    it('accepts buildId-derived value when stored source is buildId (same rank)', () => {
      const patch = normalizeOsFields(
        { os: '', buildId: 'BP2A.250605.031.A3' },
        'buildId',
        '13',
      )
      expect(patch).toMatchObject({ osVersion: '16', osVersionSource: 'buildId' })
    })
  })

  describe('partial payloads', () => {
    it('emits nothing for a settings-toggle style body', () => {
      expect(normalizeOsFields({} as any)).toEqual({})
    })

    it('ignores a blank reported version and falls back to the fingerprint', () => {
      expect(normalizeOsFields({ os: FP_15, osVersion: '   ' }).osVersion).toBe('15')
    })

    it('ignores a non-numeric api level', () => {
      const patch = normalizeOsFields({ osApiLevel: NaN as any })
      expect(patch).not.toHaveProperty('osApiLevel')
    })
  })
})
