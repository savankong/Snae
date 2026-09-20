import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  establishAttribution, isAttributionActive, commissionOwed,
  canShowFriendRecommendations, validateFriendsList, type HomeAttribution,
} from './index.ts';
import { REFERRAL } from '@snae/config';

const at = (iso: string) => new Date(iso);
const attribution = (over: Partial<HomeAttribution> = {}): HomeAttribution => ({
  buyerId: 'b1', homeCreatorId: 'c1', source: 'creator',
  startedAt: at('2026-01-01T00:00:00Z'), expiresAt: at('2026-06-30T00:00:00Z'), ...over,
});

describe('Home Creator attribution', () => {
  test('is set on the first cleared purchase and runs for the configured window', () => {
    const a = establishAttribution({
      existing: null, buyerId: 'b1', creatorId: 'c1', source: 'creator', clearedAt: at('2026-01-01T00:00:00Z'),
    });
    assert.ok(a);
    assert.equal(a!.homeCreatorId, 'c1');

    const days = Math.round((a!.expiresAt.getTime() - a!.startedAt.getTime()) / 86_400_000);
    assert.equal(days, REFERRAL.windowDays);
  });

  test('a later purchase through another link does not overwrite it', () => {
    // §14: "later link clicks do not overwrite it". The first creator to
    // convert the buyer keeps him for the window.
    const existing = attribution();
    const result = establishAttribution({
      existing, buyerId: 'b1', creatorId: 'c2', source: 'creator', clearedAt: at('2026-03-01T00:00:00Z'),
    });
    assert.equal(result, null, 'no new attribution while the current one is live');
  });

  test('a new attribution can be set once the old one has expired', () => {
    const expired = attribution({ expiresAt: at('2026-02-01T00:00:00Z') });
    const result = establishAttribution({
      existing: expired, buyerId: 'b1', creatorId: 'c2', source: 'creator', clearedAt: at('2026-03-01T00:00:00Z'),
    });
    assert.ok(result);
    assert.equal(result!.homeCreatorId, 'c2');
  });

  test('expiry is evaluated against the moment asked about', () => {
    const a = attribution();
    assert.ok(isAttributionActive(a, at('2026-03-01T00:00:00Z')));
    assert.ok(!isAttributionActive(a, at('2026-07-01T00:00:00Z')));
    assert.ok(!isAttributionActive(null, at('2026-03-01T00:00:00Z')));
  });
});

describe('cross-creator commission', () => {
  const now = at('2026-03-01T00:00:00Z');

  test('is owed when a different creator sells to an attributed buyer', () => {
    const r = commissionOwed({ attribution: attribution(), sellingCreatorId: 'c2', transactionStatus: 'cleared', at: now });
    assert.equal(r.owed, true);
    assert.equal(r.toCreatorId, 'c1');
  });

  test('is never owed on a self-referral', () => {
    // §14: self-referred transactions earn no commission — she already earns
    // her full creator share on her own session.
    const r = commissionOwed({ attribution: attribution(), sellingCreatorId: 'c1', transactionStatus: 'cleared', at: now });
    assert.equal(r.owed, false);
    assert.match(r.reason!, /Self-referral/);
  });

  test('is never owed on money that did not stick', () => {
    // §14: refunded, disputed, fraudulent and prohibited transactions earn
    // nothing — commission follows cleared money only.
    for (const status of ['refunded', 'disputed', 'fraudulent', 'prohibited'] as const) {
      const r = commissionOwed({ attribution: attribution(), sellingCreatorId: 'c2', transactionStatus: status, at: now });
      assert.equal(r.owed, false, `${status} must not earn commission`);
    }
  });

  test('is not owed once the window has closed', () => {
    const r = commissionOwed({
      attribution: attribution(), sellingCreatorId: 'c2', transactionStatus: 'cleared', at: at('2026-08-01T00:00:00Z'),
    });
    assert.equal(r.owed, false);
  });
});

describe('the no-poaching rule', () => {
  const now = at('2026-03-01T12:00:00Z');

  test('hides recommendations during a session with the Home Creator', () => {
    const shown = canShowFriendRecommendations({
      attribution: attribution(), viewingCreatorIsHome: true,
      inActiveSessionWithHome: true, lastHomeSessionEndedAt: null, now,
    });
    assert.equal(shown, false);
  });

  test('keeps them hidden for the cooldown after that session ends', () => {
    // §14: no cross-creator recommendations within 30 minutes after a session
    // with the Home Creator. This is the "poaching moment" §8 exists to remove.
    const justEnded = new Date(now.getTime() - 10 * 60_000);
    assert.equal(
      canShowFriendRecommendations({
        attribution: attribution(), viewingCreatorIsHome: true,
        inActiveSessionWithHome: false, lastHomeSessionEndedAt: justEnded, now,
      }),
      false,
    );

    const wellPast = new Date(now.getTime() - (REFERRAL.noPoachCooldownMinutes + 5) * 60_000);
    assert.equal(
      canShowFriendRecommendations({
        attribution: attribution(), viewingCreatorIsHome: true,
        inActiveSessionWithHome: false, lastHomeSessionEndedAt: wellPast, now,
      }),
      true,
    );
  });

  test('a buyer with no Home Creator has nothing to protect', () => {
    assert.equal(
      canShowFriendRecommendations({
        attribution: null, viewingCreatorIsHome: false,
        inActiveSessionWithHome: false, lastHomeSessionEndedAt: null, now,
      }),
      true,
    );
  });
});

describe('Friends list validation', () => {
  test('caps the list at the configured maximum', () => {
    const tooMany = Array.from({ length: REFERRAL.maxFriends + 1 }, (_, i) => `c${i + 2}`);
    assert.throws(() => validateFriendsList(tooMany, 'c1'), RangeError);
    assert.doesNotThrow(() => validateFriendsList(tooMany.slice(0, REFERRAL.maxFriends), 'c1'));
  });

  test('a creator cannot recommend herself or list a duplicate', () => {
    assert.throws(() => validateFriendsList(['c2', 'c1'], 'c1'), /cannot recommend herself/);
    assert.throws(() => validateFriendsList(['c2', 'c2'], 'c1'), /duplicates/);
  });
});
