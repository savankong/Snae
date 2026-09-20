import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { allocateSession, reverseAllocation, allocateTopUp, assertBalanced, creatorBalances, balanceOf } from './ledger.ts';
import { splitByRate, formatUsd, parseUsdToMinor, assertMinor } from './money.ts';

describe('money primitives', () => {
  test('rejects non-integer minor units', () => {
    assert.throws(() => assertMinor(10.5), RangeError);
  });

  test('split parts always sum to the whole', () => {
    // The property that keeps the ledger balanced: no cent is created or lost
    // to rounding, whatever the rate.
    for (const gross of [1, 7, 99, 100, 333, 1234, 99_999]) {
      for (const rate of [0, 0.05, 0.7, 0.75, 0.8, 0.85, 1]) {
        const { share, remainder } = splitByRate(gross, rate);
        assert.equal(share + remainder, gross, `${gross} at ${rate}`);
        assert.ok(Number.isInteger(share) && Number.isInteger(remainder));
      }
    }
  });

  test('formats and parses dollars symmetrically', () => {
    assert.equal(formatUsd(4250), '$42.50');
    assert.equal(formatUsd(5), '$0.05');
    assert.equal(formatUsd(-2700), '-$27.00');
    assert.equal(parseUsdToMinor('$42.50'), 4250);
    assert.equal(parseUsdToMinor('42'), 4200);
    assert.equal(parseUsdToMinor('abc'), null);
  });
});

describe('session allocation', () => {
  const base = { buyerId: 'b1', creatorId: 'c1', grossMinor: 10_000 as const };

  test('marketplace buyer, standard creator: 70/30', () => {
    const a = allocateSession({ ...base, source: 'marketplace', isFoundingCreator: false });
    assert.equal(a.creatorMinor, 7000);
    assert.equal(a.platformMinor, 3000);
    assert.equal(a.referralMinor, 0);
    assertBalanced(a.entries);
  });

  test('creator-brought buyer, founding creator: 85/15', () => {
    const a = allocateSession({ ...base, source: 'creator', isFoundingCreator: true });
    assert.equal(a.creatorMinor, 8500);
    assert.equal(a.platformMinor, 1500);
    assertBalanced(a.entries);
  });

  test('cross-creator commission comes out of the platform share, not the creator', () => {
    // §8: commission is "paid from platform share". The creator who did the
    // work must earn exactly the same whether or not a referral is owed.
    const without = allocateSession({ ...base, source: 'marketplace', isFoundingCreator: false });
    const with_ = allocateSession({
      ...base, source: 'marketplace', isFoundingCreator: false, referringCreatorId: 'c2',
    });

    assert.equal(with_.creatorMinor, without.creatorMinor, 'creator share must be unaffected');
    assert.equal(with_.referralMinor, 500, '5% of gross');
    assert.equal(with_.platformMinor, without.platformMinor - 500, 'platform absorbs it');
    assertBalanced(with_.entries);
  });

  test('self-referral earns no commission', () => {
    // §14: self-referred transactions earn no commission. A creator cannot be
    // her own Home Creator for the purpose of getting paid twice.
    const a = allocateSession({
      ...base, source: 'creator', isFoundingCreator: false, referringCreatorId: 'c1',
    });
    assert.equal(a.referralMinor, 0);
    assert.equal(a.entries.filter((e) => e.accountType === 'referral_payable').length, 0);
  });

  test('refuses a configured rate pair that would pay out more than the platform earns', () => {
    // Take and commission rates are admin-configurable (§7.2), so nothing stops
    // an operator setting a 97% creator share alongside a 5% commission. That
    // combination pays out money the platform does not have, and must fail
    // loudly rather than silently book a negative platform balance.
    assert.throws(
      () => allocateSession({
        ...base, source: 'creator', isFoundingCreator: false, referringCreatorId: 'c2',
        rates: { creatorShare: 0.97, commission: 0.05 },
      }),
      /exceeds platform share/,
    );

    // The launch defaults are comfortably clear of that boundary.
    for (const [creatorShare, commission] of [[0.7, 0.05], [0.8, 0.05], [0.85, 0.05]] as const) {
      assert.doesNotThrow(() => allocateSession({
        ...base, source: 'creator', isFoundingCreator: false, referringCreatorId: 'c2',
        rates: { creatorShare, commission },
      }));
    }
  });

  test('every allocation balances to zero across accounts', () => {
    for (const gross of [1, 99, 100, 1337, 99_999]) {
      for (const source of ['creator', 'marketplace'] as const) {
        const a = allocateSession({
          buyerId: 'b1', creatorId: 'c1', grossMinor: gross, source,
          isFoundingCreator: false, referringCreatorId: 'c2',
        });
        assertBalanced(a.entries);
      }
    }
  });
});

describe('reversals', () => {
  test('a refund reverses every entry including the commission', () => {
    // §14: refunded transactions earn no referral commission, so the payable
    // must come back too — not just the creator and platform legs.
    const a = allocateSession({
      buyerId: 'b1', creatorId: 'c1', grossMinor: 10_000, source: 'marketplace',
      isFoundingCreator: false, referringCreatorId: 'c2',
    });
    const reversed = reverseAllocation(a, 'guarantee_refund');

    assert.equal(reversed.length, a.entries.length);
    assertBalanced(reversed);

    const all = [...a.entries, ...reversed];
    assert.equal(balanceOf(all, 'buyer_wallet', 'b1'), 0, 'buyer made whole');
    assert.equal(balanceOf(all, 'creator_earnings', 'c1'), 0, 'creator clawed back');
    assert.equal(balanceOf(all, 'referral_payable', 'c2'), 0, 'commission reversed');
  });
});

describe('top-up', () => {
  test('credits the wallet and books the processor fee against the platform', () => {
    const entries = allocateTopUp('b1', 5000, 600);
    assertBalanced(entries);
    assert.equal(balanceOf(entries, 'buyer_wallet', 'b1'), 5000, 'buyer gets the full face value');
    assert.equal(balanceOf(entries, 'processor_fees', null), 600);
    // The fee is the platform's cost, never deducted from what the buyer can spend.
    assert.equal(balanceOf(entries, 'platform_revenue', null), -5600);
  });
});

describe('creator balances', () => {
  test('separates cleared from pending by availableAt', () => {
    const now = new Date('2026-09-20T00:00:00Z');
    const past = new Date('2026-09-13T00:00:00Z');
    const future = new Date('2026-09-27T00:00:00Z');

    const entries = [
      { accountType: 'creator_earnings' as const, accountId: 'c1', amountMinor: 5000, entryType: 'session_draw' as const, availableAt: past },
      { accountType: 'creator_earnings' as const, accountId: 'c1', amountMinor: 3000, entryType: 'session_draw' as const, availableAt: future },
      { accountType: 'creator_earnings' as const, accountId: 'c2', amountMinor: 9999, entryType: 'session_draw' as const, availableAt: past },
    ];

    const b = creatorBalances(entries, 'c1', now);
    assert.equal(b.cleared, 5000);
    assert.equal(b.pending, 3000);
    assert.equal(b.lifetime, 8000, 'other creators are excluded');
  });
});
