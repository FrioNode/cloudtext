import { describe, expect, it } from 'vitest'
import {
  MONEY_BACK_DAYS,
  PLAN_TIERS,
  checkoutPath,
  findPlanTier,
  formatPlanPrice,
  formatPriceCaption,
  monthlyEquivalent,
  yearlySavingPercent,
} from './plans'

const pro = PLAN_TIERS.find((t) => t.id === 'pro')!
const scale = PLAN_TIERS.find((t) => t.id === 'scale')!
const free = PLAN_TIERS.find((t) => t.id === 'free')!

// These values mirror the marketing pricing page. They are pinned here so that
// if the two drift apart, this fails instead of quietly showing a customer a
// price we do not charge.
describe('PLAN_TIERS', () => {
  it('matches the marketing pricing page', () => {
    expect(
      PLAN_TIERS.map((t) => [t.id, t.monthlyPrice, t.yearlyPrice])
    ).toEqual([
      ['free', 0, undefined],
      ['pro', 9.99, 99.99],
      ['scale', 29.99, 299.99],
    ])
  })

  it('offers the three self-serve tiers, Scale included', () => {
    expect(PLAN_TIERS.map((t) => t.name)).toEqual(['Free', 'Pro', 'Scale'])
  })

  it('highlights exactly one tier', () => {
    expect(PLAN_TIERS.filter((t) => t.isPopular)).toHaveLength(1)
    expect(PLAN_TIERS.find((t) => t.isPopular)?.id).toBe('pro')
  })

  it('gives every tier features to show', () => {
    for (const tier of PLAN_TIERS) {
      expect(tier.features.length).toBeGreaterThan(0)
      expect(tier.description).not.toBe('')
    }
  })

  // The id doubles as the /checkout/{id} segment, so it has to stay
  // URL-clean.
  it('uses lowercase ids safe for the checkout route', () => {
    for (const tier of PLAN_TIERS) {
      expect(tier.id).toMatch(/^[a-z][a-z0-9-]*$/)
    }
  })
})

describe('formatPlanPrice', () => {
  // "$0" not "Free", so the price does not just repeat the tier name above it.
  it('renders the free tier as a price', () => {
    expect(formatPlanPrice(0)).toBe('$0')
  })

  it('always shows cents on a paid plan', () => {
    expect(formatPlanPrice(9.99)).toBe('$9.99')
    expect(formatPlanPrice(30)).toBe('$30.00')
  })
})

// The yearly saving is quoted to customers, so it is derived from PLAN_TIERS
// and asserted here rather than written into the markup as a literal.
describe('yearly pricing', () => {
  it('derives the per-month equivalent of a yearly plan', () => {
    expect(monthlyEquivalent(pro)).toBeCloseTo(8.3325, 4)
    expect(monthlyEquivalent(scale)).toBeCloseTo(24.99917, 4)
  })

  it('has no yearly equivalent for a tier without a yearly price', () => {
    expect(monthlyEquivalent(free)).toBeUndefined()
    expect(yearlySavingPercent(free)).toBeUndefined()
  })

  // 12 x $9.99 = $119.88 against $99.99 is $19.89 saved, or 16.6%.
  it('quotes a saving the arithmetic actually supports', () => {
    expect(yearlySavingPercent(pro)).toBe(17)
    expect(yearlySavingPercent(scale)).toBe(17)
  })

  // Guards the claim itself: paying yearly must never cost more than monthly.
  it('never quotes a saving on a plan that is not cheaper yearly', () => {
    for (const tier of PLAN_TIERS) {
      if (!tier.yearlyPrice) continue
      expect(tier.yearlyPrice).toBeLessThan(tier.monthlyPrice * 12)
    }
  })

  // The picker headlines the month-to-month price, so the caption carries the
  // yearly alternative and must not repeat the headline.
  it('captions a headline price without repeating it', () => {
    expect(formatPriceCaption(pro)).toBe(
      'or $8.33/month billed yearly at $99.99'
    )
    expect(formatPriceCaption(scale)).toBe(
      'or $25.00/month billed yearly at $299.99'
    )
    expect(formatPriceCaption(pro)).not.toContain('$9.99')
  })

  it('captions the free tier without quoting a price', () => {
    expect(formatPriceCaption(free)).toBe('no card required')
  })

  it('captions a paid tier that has no yearly option', () => {
    expect(formatPriceCaption({ ...pro, yearlyPrice: undefined })).toBe(
      'billed monthly'
    )
  })

  // The caption is the only place the yearly total is quoted, so it has to
  // carry both the total and what it works out to per month.
  it('quotes both the yearly total and its per-month equivalent', () => {
    for (const tier of [pro, scale]) {
      expect(formatPriceCaption(tier)).toContain(
        formatPlanPrice(tier.yearlyPrice!)
      )
      expect(formatPriceCaption(tier)).toContain(
        formatPlanPrice(monthlyEquivalent(tier)!)
      )
    }
  })
})

describe('findPlanTier', () => {
  it('is forgiving about casing and whitespace', () => {
    expect(findPlanTier('Pro')?.id).toBe('pro')
    expect(findPlanTier('  SCALE ')?.id).toBe('scale')
  })

  it('returns nothing for an unknown or missing name', () => {
    expect(findPlanTier('enterprise')).toBeUndefined()
    expect(findPlanTier(undefined)).toBeUndefined()
    expect(findPlanTier(null)).toBeUndefined()
    expect(findPlanTier('')).toBeUndefined()
  })
})

// A CTA that omits the interval stops on the chooser instead of continuing to
// the payment page, so the interval is pinned here rather than trusted to each
// call site.
describe('checkoutPath', () => {
  it('always names an interval', () => {
    for (const tier of PLAN_TIERS) {
      expect(checkoutPath(tier.id)).toContain('billingInterval=')
    }
  })

  it('defaults to the month-to-month interval', () => {
    expect(checkoutPath('pro')).toBe('/checkout/pro?billingInterval=monthly')
    expect(checkoutPath('scale')).toBe('/checkout/scale?billingInterval=monthly')
  })

  it('carries an explicit interval through', () => {
    expect(checkoutPath('pro', 'yearly')).toBe(
      '/checkout/pro?billingInterval=yearly'
    )
  })
})

// Mirrors the published refund policy. Quoting a longer window than we honour
// would be a promise we do not keep.
describe('MONEY_BACK_DAYS', () => {
  it('matches the refund policy for each interval', () => {
    expect(MONEY_BACK_DAYS.monthly).toBe(7)
    expect(MONEY_BACK_DAYS.yearly).toBe(14)
  })
})
