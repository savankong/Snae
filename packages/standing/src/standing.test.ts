import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeStanding, creatorView, evaluateAccept, tierAtLeast, type StandingInputs, type CreatorFilters } from './index.ts';

const clean: StandingInputs = {
  ageVerified: true, accountAgeDays: 120, completedSessions: 20, chargebacks: 0,
  rejectedClaims: 0, blocksReceived: 0, reportsUpheld: 0,
  ratings: { respectful: 20, paidAsAgreed: 20, followedRules: 20, total: 20 },
  repeatRelationships: 4,
};

describe('standing computation', () => {
  test('an unverified buyer cannot rise above New', () => {
    assert.equal(computeStanding({ ...clean, ageVerified: false }).tier, 'new');
  });

  test('a chargeback drops the buyer to New regardless of everything else', () => {
    // §3.1: friendly fraud is the behaviour the whole moat exists to price out,
    // so it outranks a long clean history.
    const s = computeStanding({ ...clean, chargebacks: 1 });
    assert.equal(s.tier, 'new');
    assert.deepEqual(s.badges, [], 'no badges survive a dispute');
    assert.match(s.reasons[0]!, /dispute/i);
  });

  test('tiers climb with history', () => {
    assert.equal(computeStanding({ ...clean, completedSessions: 1, accountAgeDays: 1, repeatRelationships: 0,
      ratings: { respectful: 1, paidAsAgreed: 1, followedRules: 1, total: 1 } }).tier, 'new');
    assert.equal(computeStanding({ ...clean, completedSessions: 4, accountAgeDays: 10, repeatRelationships: 0,
      ratings: { respectful: 3, paidAsAgreed: 4, followedRules: 4, total: 4 } }).tier, 'good');
    assert.equal(computeStanding({ ...clean, completedSessions: 12, accountAgeDays: 45 }).tier, 'trusted');
    assert.equal(computeStanding({ ...clean, completedSessions: 40, accountAgeDays: 120 }).tier, 'top');
  });

  test('recent penalties pull a buyer down rather than capping him', () => {
    // Creators need to see bad behaviour immediately, so penalties demote
    // instead of merely freezing an earned tier.
    assert.equal(computeStanding({ ...clean, blocksReceived: 1 }).tier, 'good');
    assert.equal(computeStanding({ ...clean, reportsUpheld: 2 }).tier, 'new');
  });

  test('buyers always get reasons they can act on', () => {
    // §14: buyers can see their own tier and the reasons for it, and appeal.
    for (const inputs of [clean, { ...clean, chargebacks: 1 }, { ...clean, ageVerified: false }]) {
      assert.ok(computeStanding(inputs).reasons.length > 0);
    }
  });
});

describe('creator projection', () => {
  test('exposes only tier and badges to a creator', () => {
    // §3.2: creators never see raw ratings, other creators' identities, or
    // spending. Enforcing that in the domain layer means a careless template
    // cannot leak it.
    const s = computeStanding(clean);
    const view = creatorView(s);

    assert.deepEqual(Object.keys(view).sort(), ['badges', 'tier']);
    assert.ok(!('reasons' in view));
    assert.ok(!('computedAt' in view));
    assert.ok(!('modelVersion' in view));
  });
});

describe('creator accept filters', () => {
  const filters: CreatorFilters = { minBuyerTier: 'trusted', newBuyerMinimumMinor: 2500, autoDeclineRecentDisputes: true };
  const standing = computeStanding(clean);

  test('accepts a qualifying buyer', () => {
    assert.deepEqual(
      evaluateAccept({ filters, standing, hasRecentDispute: false, walletBalanceMinor: 5000, isBlocked: false, regionBlocked: false }),
      { accepted: true },
    );
  });

  test('blocks and region rules take precedence over everything', () => {
    assert.equal(
      evaluateAccept({ filters, standing, hasRecentDispute: false, walletBalanceMinor: 5000, isBlocked: true, regionBlocked: false }).accepted,
      false,
    );
    const regional = evaluateAccept({ filters, standing, hasRecentDispute: false, walletBalanceMinor: 5000, isBlocked: false, regionBlocked: true });
    assert.equal(regional.accepted, false);
    assert.equal(regional.accepted === false && regional.reason, 'region_blocked');
  });

  test('declines a buyer below the creator’s minimum tier', () => {
    const low = computeStanding({ ...clean, completedSessions: 1, accountAgeDays: 2, repeatRelationships: 0,
      ratings: { respectful: 1, paidAsAgreed: 1, followedRules: 1, total: 1 } });
    const d = evaluateAccept({ filters, standing: low, hasRecentDispute: false, walletBalanceMinor: 5000, isBlocked: false, regionBlocked: false });
    assert.equal(d.accepted, false);
    assert.equal(d.accepted === false && d.reason, 'below_tier');
  });

  test('applies the new-buyer wallet minimum only to New buyers', () => {
    const open: CreatorFilters = { ...filters, minBuyerTier: 'new' };
    const newBuyer = computeStanding({ ...clean, completedSessions: 0, accountAgeDays: 1, repeatRelationships: 0,
      ratings: { respectful: 0, paidAsAgreed: 0, followedRules: 0, total: 0 } });

    const poor = evaluateAccept({ filters: open, standing: newBuyer, hasRecentDispute: false, walletBalanceMinor: 500, isBlocked: false, regionBlocked: false });
    assert.equal(poor.accepted === false && poor.reason, 'below_minimum');

    // A Trusted buyer with the same small balance is not subject to the minimum.
    const trusted = evaluateAccept({ filters: open, standing, hasRecentDispute: false, walletBalanceMinor: 500, isBlocked: false, regionBlocked: false });
    assert.equal(trusted.accepted, true);
  });

  test('tier ordering is total and correct', () => {
    assert.ok(tierAtLeast('top', 'new'));
    assert.ok(tierAtLeast('trusted', 'trusted'));
    assert.ok(!tierAtLeast('good', 'trusted'));
  });
});
