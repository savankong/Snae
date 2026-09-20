import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  effectiveStatus, isPrimeTime, canAcceptAnother, queuePositions, rankCreators,
  type Availability, type QueueEntry, type RankableCreator,
} from './index.ts';
import { CONCURRENCY } from '@snae/config';

const availability = (over: Partial<Availability> = {}): Availability => ({
  creatorId: 'c1', status: 'live', textEnabled: true, voiceEnabled: true,
  videoEnabled: false, startsAt: null, expiresAt: null, ...over,
});

describe('availability expiry', () => {
  test('an expired availability reads as offline no matter what it says', () => {
    // FR-002: availability expires so nobody is shown live after walking away.
    // Over-promising availability is the failure mode the design brief calls out.
    const now = new Date('2026-09-20T22:00:00Z');
    const stale = availability({ status: 'live', expiresAt: new Date('2026-09-20T21:00:00Z') });
    assert.equal(effectiveStatus(stale, now), 'offline');
  });

  test('a future start reads as booking-only, not live', () => {
    const now = new Date('2026-09-20T18:00:00Z');
    const later = availability({ status: 'live', startsAt: new Date('2026-09-20T20:00:00Z') });
    assert.equal(effectiveStatus(later, now), 'booking_only');
  });

  test('a live, unexpired availability reads as live', () => {
    const now = new Date('2026-09-20T22:00:00Z');
    assert.equal(effectiveStatus(availability({ expiresAt: new Date('2026-09-20T23:00:00Z') }), now), 'live');
  });
});

describe('Prime Time windows', () => {
  const windows = [{ label: 'ET evening', tz: 'America/New_York', startHour: 19, endHour: 1 }];

  test('handles a window that wraps past midnight', () => {
    // 19:00–01:00 is the normal shape for an evening window, and naive
    // start <= hour < end comparison would break it.
    assert.equal(isPrimeTime(new Date('2026-09-21T00:00:00Z'), windows), true,  '20:00 ET');
    assert.equal(isPrimeTime(new Date('2026-09-21T04:30:00Z'), windows), true,  '00:30 ET');
    assert.equal(isPrimeTime(new Date('2026-09-21T06:00:00Z'), windows), false, '02:00 ET');
    assert.equal(isPrimeTime(new Date('2026-09-20T20:00:00Z'), windows), false, '16:00 ET');
  });
});

describe('concurrency caps', () => {
  test('a voice call occupies the creator entirely', () => {
    // §2.2: single-person accounts structurally remove the chatter-team model.
    // One person cannot hold a call and text conversations at the same time.
    assert.equal(canAcceptAnother('voice', { voice: 0, text: 0 }), true);
    assert.equal(canAcceptAnother('voice', { voice: 1, text: 0 }), false);
    assert.equal(canAcceptAnother('voice', { voice: 0, text: 1 }), false, 'not while texting');
    assert.equal(canAcceptAnother('text', { voice: 1, text: 0 }), false, 'not while on a call');
  });

  test('text sessions are capped at the configured number', () => {
    assert.equal(canAcceptAnother('text', { voice: 0, text: CONCURRENCY.text - 1 }), true);
    assert.equal(canAcceptAnother('text', { voice: 0, text: CONCURRENCY.text }), false);
  });
});

describe('queueing', () => {
  test('orders by priority first, then by arrival', () => {
    // Queue priority is a Buyer Standing perk (§3.2), but within a priority
    // band first come is first served.
    const entries: QueueEntry[] = [
      { buyerId: 'early-low', creatorId: 'c1', joinedAt: new Date('2026-09-20T20:00:00Z'), heldMinor: 900, priority: 0 },
      { buyerId: 'late-high', creatorId: 'c1', joinedAt: new Date('2026-09-20T20:05:00Z'), heldMinor: 900, priority: 2 },
      { buyerId: 'early-high', creatorId: 'c1', joinedAt: new Date('2026-09-20T20:01:00Z'), heldMinor: 900, priority: 2 },
    ];
    const ordered = queuePositions(entries);
    assert.deepEqual(ordered.map((e) => e.buyerId), ['early-high', 'late-high', 'early-low']);
    assert.deepEqual(ordered.map((e) => e.position), [1, 2, 3]);
  });

  test('does not mutate the input', () => {
    const entries: QueueEntry[] = [
      { buyerId: 'a', creatorId: 'c1', joinedAt: new Date(), heldMinor: 0, priority: 0 },
      { buyerId: 'b', creatorId: 'c1', joinedAt: new Date(), heldMinor: 0, priority: 5 },
    ];
    const before = entries.map((e) => e.buyerId);
    queuePositions(entries);
    assert.deepEqual(entries.map((e) => e.buyerId), before);
  });
});

describe('discovery ranking', () => {
  const base: RankableCreator = {
    creatorId: 'x', status: 'offline', sealAgeSeconds: null, sessionsVerifiedPct: 0,
    medianResponseSeconds: null, isFavorite: false, isFriendOfHome: false, lastActiveAt: null,
  };

  test('availability dominates the ordering', () => {
    const ranked = rankCreators([
      { ...base, creatorId: 'offline' },
      { ...base, creatorId: 'live', status: 'live' },
      { ...base, creatorId: 'booking', status: 'booking_only' },
    ]);
    assert.deepEqual(ranked.map((c) => c.creatorId), ['live', 'booking', 'offline']);
  });

  test('a favourite outranks a stranger at the same availability', () => {
    const ranked = rankCreators([
      { ...base, creatorId: 'stranger', status: 'live' },
      { ...base, creatorId: 'favourite', status: 'live', isFavorite: true },
    ]);
    assert.equal(ranked[0]!.creatorId, 'favourite');
  });

  test('a fresher presence seal outranks a stale one', () => {
    const ranked = rankCreators([
      { ...base, creatorId: 'stale', status: 'live', sealAgeSeconds: 800 },
      { ...base, creatorId: 'fresh', status: 'live', sealAgeSeconds: 20 },
    ]);
    assert.equal(ranked[0]!.creatorId, 'fresh');
  });
});
