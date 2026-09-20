import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { meterVoice, meterTextPerMessage, validateOffer, reservationFor, canAfford, type VoiceOffer, type TextOffer } from './pricing.ts';

const voice: VoiceOffer = { modality: 'voice', perMinuteMinor: 450, minSeconds: 120 };
const perMessage: TextOffer = { modality: 'text', pricing: 'per_message', amountMinor: 150 };

describe('offer validation', () => {
  test('rejects prices outside platform bounds', () => {
    // §7.1: price floors protect the premium positioning. A creator cannot
    // undercut below the floor, and cannot price above the ceiling either.
    assert.throws(() => validateOffer({ modality: 'voice', perMinuteMinor: 50, minSeconds: 120 }), RangeError);
    assert.throws(() => validateOffer({ modality: 'voice', perMinuteMinor: 99_999, minSeconds: 120 }), RangeError);
    assert.doesNotThrow(() => validateOffer(voice));
  });

  test('rejects a voice offer below the minimum session length', () => {
    assert.throws(() => validateOffer({ modality: 'voice', perMinuteMinor: 450, minSeconds: 30 }), RangeError);
  });
});

describe('voice metering', () => {
  test('bills per whole minute started', () => {
    const start = new Date('2026-09-20T20:00:00Z');
    const r = meterVoice({ offer: voice, billingStartedAt: start, endedAt: new Date('2026-09-20T20:05:30Z') });
    assert.equal(r.grossMinor, 6 * 450, '5m30s bills as 6 minutes');
  });

  test('charges the minimum even on a very short call', () => {
    const start = new Date('2026-09-20T20:00:00Z');
    const r = meterVoice({ offer: voice, billingStartedAt: start, endedAt: new Date('2026-09-20T20:00:10Z') });
    assert.equal(r.billableSeconds, 120);
    assert.equal(r.grossMinor, 2 * 450);
  });

  test('subtracts intervals where billing was paused by a failed re-check', () => {
    // §14: a failed re-check pauses billing. The buyer must not pay for the
    // window in which presence could not be confirmed.
    const start = new Date('2026-09-20T20:00:00Z');
    const r = meterVoice({
      offer: voice,
      billingStartedAt: start,
      endedAt: new Date('2026-09-20T20:10:00Z'),
      pausedIntervals: [{ from: new Date('2026-09-20T20:03:00Z'), to: new Date('2026-09-20T20:05:00Z') }],
    });
    assert.equal(r.grossMinor, 8 * 450, '10 minutes less a 2 minute pause');
  });

  test('refuses impossible timestamps rather than billing a negative duration', () => {
    const start = new Date('2026-09-20T20:05:00Z');
    assert.throws(
      () => meterVoice({ offer: voice, billingStartedAt: start, endedAt: new Date('2026-09-20T20:00:00Z') }),
      /ended before billing started/,
    );
    assert.throws(
      () => meterVoice({
        offer: voice, billingStartedAt: start, endedAt: new Date('2026-09-20T20:10:00Z'),
        pausedIntervals: [{ from: new Date('2026-09-20T20:08:00Z'), to: new Date('2026-09-20T20:06:00Z') }],
      }),
      /Paused interval ends before it begins/,
    );
  });

  test('a pause longer than the call floors at the minimum, never below zero', () => {
    const start = new Date('2026-09-20T20:00:00Z');
    const r = meterVoice({
      offer: voice, billingStartedAt: start, endedAt: new Date('2026-09-20T20:05:00Z'),
      pausedIntervals: [{ from: start, to: new Date('2026-09-20T20:05:00Z') }],
    });
    assert.ok(r.grossMinor > 0);
    assert.equal(r.billableSeconds, 120, 'falls back to the session minimum');
  });
});

describe('text metering', () => {
  test('bills only the buyer messages passed in', () => {
    assert.equal(meterTextPerMessage(perMessage, 9), 9 * 150);
    assert.equal(meterTextPerMessage(perMessage, 0), 0);
  });

  test('refuses to meter a block offer as per-message', () => {
    assert.throws(
      () => meterTextPerMessage({ modality: 'text', pricing: 'block', amountMinor: 2500 }, 5),
      /not per-message priced/,
    );
  });
});

describe('reservations', () => {
  test('reserves the voice minimum up front', () => {
    assert.equal(reservationFor(voice), 2 * 450);
  });

  test('affordability is decided against the reservation, not the rate', () => {
    // §15.3: never trust a client-provided price. The server decides whether a
    // session can start, and it uses the full reservation.
    assert.equal(canAfford(900, voice), true);
    assert.equal(canAfford(899, voice), false);
  });
});
