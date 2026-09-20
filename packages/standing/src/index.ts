/**
 * Buyer Standing (§3.2, FR-023). A platform-computed tier creators see before
 * accepting a session.
 *
 * Two constraints shape this whole module, both from §14 and §16:
 *   1. Computed server-side from *structured* inputs only. Free-text creator
 *      notes are never an input and are never shared between creators.
 *   2. Creators see a tier and badges — never raw ratings, other creators'
 *      identities, or spending amounts. `creatorView` is the only projection
 *      that may cross to a creator, and it is the narrow one by construction.
 *
 * Counsel must confirm this reads as an internal trust feature rather than a
 * consumer report (§16), which is why buyers get reasons and an appeal path.
 */

export type Tier = 'new' | 'good' | 'trusted' | 'top';

export const TIER_ORDER: readonly Tier[] = ['new', 'good', 'trusted', 'top'] as const;

export function tierAtLeast(actual: Tier, minimum: Tier): boolean {
  return TIER_ORDER.indexOf(actual) >= TIER_ORDER.indexOf(minimum);
}

/** Structured inputs only. Note the absence of any free-text field. */
export interface StandingInputs {
  ageVerified: boolean;
  accountAgeDays: number;
  completedSessions: number;
  /** Disputes the buyer filed with his bank. Heavily weighted. */
  chargebacks: number;
  /** Guarantee claims that were reviewed and rejected. */
  rejectedClaims: number;
  blocksReceived: number;
  reportsUpheld: number;
  /** Structured per-session creator ratings: counts, not text. */
  ratings: { respectful: number; paidAsAgreed: number; followedRules: number; total: number };
  /** Distinct creators he has seen more than once. */
  repeatRelationships: number;
}

export interface Standing {
  tier: Tier;
  badges: Badge[];
  /** Buyer-visible explanations. §14: buyers can see their tier and its reasons. */
  reasons: string[];
  computedAt: Date;
  modelVersion: string;
}

export type Badge = 'no_disputes' | 'regular_3mo' | 'verified_adult' | 'high_rated' | 'new_here';

export const MODEL_VERSION = 'standing-v1';

/**
 * Compute standing. Deliberately a transparent rule set rather than a learned
 * model: buyers have appeal rights (§14), and a rule you cannot explain is a
 * rule you cannot defend in an appeal.
 */
export function computeStanding(i: StandingInputs, now = new Date()): Standing {
  const reasons: string[] = [];
  const badges: Badge[] = [];

  // A chargeback is disqualifying on its own — it is the single behaviour the
  // whole moat is built to price out (§3.1).
  if (i.chargebacks > 0) {
    return {
      tier: 'new',
      badges: [],
      reasons: [`${i.chargebacks} payment dispute${i.chargebacks > 1 ? 's' : ''} on file. Standing recovers after 180 days of good activity.`],
      computedAt: now,
      modelVersion: MODEL_VERSION,
    };
  }

  if (!i.ageVerified) {
    return {
      tier: 'new',
      badges: [],
      reasons: ['Age verification not yet complete.'],
      computedAt: now,
      modelVersion: MODEL_VERSION,
    };
  }
  badges.push('verified_adult');

  const ratingRate = i.ratings.total > 0
    ? (i.ratings.respectful + i.ratings.paidAsAgreed + i.ratings.followedRules) / (i.ratings.total * 3)
    : 0;

  const penalties = i.blocksReceived + i.reportsUpheld * 2 + i.rejectedClaims;

  // Earn a tier from history alone, then apply penalties as a demotion. The two
  // steps are kept separate on purpose: folding penalties into the climb gates
  // would double-count them and drop a long-standing buyer with one block to
  // the same tier as a stranger, which is not the signal a creator needs.
  let tier: Tier = 'new';
  if (i.completedSessions >= 3) tier = 'good';
  if (i.completedSessions >= 10 && i.accountAgeDays >= 30 && ratingRate >= 0.85) tier = 'trusted';
  if (i.completedSessions >= 30 && i.accountAgeDays >= 90 && ratingRate >= 0.93 && i.repeatRelationships >= 3) tier = 'top';

  // Recent bad behaviour is visible to creators immediately: three or more
  // penalties reset to New, one or two drop to Good regardless of how much
  // history backs the account.
  if (penalties >= 3) tier = 'new';
  else if (penalties > 0) tier = TIER_ORDER[Math.min(TIER_ORDER.indexOf(tier), TIER_ORDER.indexOf('good'))]!;

  if (i.chargebacks === 0 && i.completedSessions >= 3) badges.push('no_disputes');
  if (i.accountAgeDays >= 90 && i.repeatRelationships >= 1) badges.push('regular_3mo');
  if (ratingRate >= 0.93 && i.ratings.total >= 5) badges.push('high_rated');
  if (i.completedSessions < 3) badges.push('new_here');

  if (tier === 'new' && penalties > 0) reasons.push('Recent reports or blocks on this account.');
  if (tier === 'new' && i.completedSessions < 3) reasons.push('Fewer than 3 completed sessions so far.');
  if (tier === 'good') reasons.push('Good payment history and no disputes.');
  if (tier === 'trusted') reasons.push('Consistent, well-rated sessions over 30+ days.');
  if (tier === 'top') reasons.push('Long history, top ratings, and repeat relationships with creators.');

  return { tier, badges, reasons, computedAt: now, modelVersion: MODEL_VERSION };
}

/**
 * The ONLY projection of standing that may be shown to a creator (§3.2).
 * Reasons and raw inputs are stripped here, not at the template — keeping the
 * narrowing in the domain layer means a careless component cannot leak them.
 */
export function creatorView(s: Standing): { tier: Tier; badges: Badge[] } {
  return { tier: s.tier, badges: s.badges };
}

/** Creator accept filters (FR-024). Enforced server-side on session create. */
export interface CreatorFilters {
  minBuyerTier: Tier;
  /** Higher wallet minimum for buyers at the 'new' tier, in minor units. */
  newBuyerMinimumMinor: number;
  autoDeclineRecentDisputes: boolean;
}

export type AcceptDecision =
  | { accepted: true }
  | { accepted: false; reason: 'below_tier' | 'recent_dispute' | 'below_minimum' | 'blocked' | 'region_blocked' };

export function evaluateAccept(input: {
  filters: CreatorFilters;
  standing: Standing;
  hasRecentDispute: boolean;
  walletBalanceMinor: number;
  isBlocked: boolean;
  regionBlocked: boolean;
}): AcceptDecision {
  if (input.isBlocked) return { accepted: false, reason: 'blocked' };
  if (input.regionBlocked) return { accepted: false, reason: 'region_blocked' };
  if (input.filters.autoDeclineRecentDisputes && input.hasRecentDispute) {
    return { accepted: false, reason: 'recent_dispute' };
  }
  if (!tierAtLeast(input.standing.tier, input.filters.minBuyerTier)) {
    return { accepted: false, reason: 'below_tier' };
  }
  if (input.standing.tier === 'new' && input.walletBalanceMinor < input.filters.newBuyerMinimumMinor) {
    return { accepted: false, reason: 'below_minimum' };
  }
  return { accepted: true };
}

export const TIER_LABEL: Record<Tier, string> = {
  new: 'New',
  good: 'Good',
  trusted: 'Trusted',
  top: 'Top',
};

export const BADGE_LABEL: Record<Badge, string> = {
  no_disputes: 'No disputes',
  regular_3mo: 'Regular for 3 months',
  verified_adult: 'Verified adult',
  high_rated: 'Highly rated',
  new_here: 'New here',
};
