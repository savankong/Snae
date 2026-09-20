import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  billingGate, onRecheckResult, sealFor, triageClaim, riskScore,
  nextRecheckDelaySeconds, transcriptContainsBuyerName, validateLiveHelloDuration,
  presenceRecord, type PresenceCheck,
} from './index.ts';
import { PRESENCE } from '@snae/config';

const check = (over: Partial<PresenceCheck> = {}): PresenceCheck => ({
  id: 'p1', sessionId: 's1', creatorId: 'c1', type: 'live_hello',
  providerRef: 'ref', result: 'pass', riskSignals: {}, createdAt: new Date(), ...over,
});

describe('billing gate', () => {
  test('blocks billing without a passing Live Hello', () => {
    // §14: "No paid session bills before a passing Live Hello." Each failure
    // mode must be distinguishable so the UI can say the right thing.
    assert.deepEqual(billingGate(null), { canBill: false, reason: 'no_live_hello' });
    assert.deepEqual(billingGate(check({ result: 'pending' })), { canBill: false, reason: 'live_hello_pending' });
    assert.deepEqual(billingGate(check({ result: 'fail' })), { canBill: false, reason: 'live_hello_failed' });
    assert.deepEqual(billingGate(check({ result: 'error' })), { canBill: false, reason: 'live_hello_failed' });
  });

  test('allows billing only on a pass', () => {
    assert.deepEqual(billingGate(check({ result: 'pass' })), { canBill: true });
  });
});

describe('re-check outcomes', () => {
  test('one failure pauses billing, two consecutive end the session', () => {
    // §14 exactly: a failed re-check pauses billing; two consecutive failures
    // end the session and refund the affected portion.
    assert.equal(onRecheckResult(0, 'fail'), 'pause_billing');
    assert.equal(onRecheckResult(1, 'fail'), 'end_and_refund');
  });

  test('a pass always continues and clears the streak', () => {
    assert.equal(onRecheckResult(1, 'pass'), 'continue');
  });

  test('respects a configured failure threshold', () => {
    assert.equal(PRESENCE.maxConsecutiveRecheckFailures, 2);
  });
});

describe('risk weighting', () => {
  test('no signals means no risk, and risk never exceeds 1', () => {
    assert.equal(riskScore({}), 0);
    const all = riskScore({
      deviceChanged: true, concurrentSessionSpike: true, typingCadenceAnomaly: true,
      pastePatternDetected: true, claimFiled: true,
    });
    assert.ok(all > 0.9 && all <= 1, `expected high but bounded risk, got ${all}`);
  });

  test('signals compound rather than simply adding', () => {
    const one = riskScore({ deviceChanged: true });
    const two = riskScore({ deviceChanged: true, pastePatternDetected: true });
    assert.ok(two > one);
    assert.ok(two < one + riskScore({ pastePatternDetected: true }), 'must not simply sum');
  });

  test('risk shortens the re-check interval, bounded by the configured floor', () => {
    // §2.5: re-checks are "silent and risk-weighted, not constant" — creator
    // friction is the cost, so a clean session must drift to the base interval.
    const clean = nextRecheckDelaySeconds({});
    const risky = nextRecheckDelaySeconds({ deviceChanged: true, claimFiled: true, pastePatternDetected: true });

    assert.equal(clean, PRESENCE.recheckBaseIntervalSeconds);
    assert.ok(risky < clean);
    assert.ok(risky >= PRESENCE.recheckMinIntervalSeconds, 'never tighter than the floor');
  });
});

describe('Live Hello validation', () => {
  test('enforces the 3-5 second window', () => {
    assert.throws(() => validateLiveHelloDuration(2), RangeError);
    assert.throws(() => validateLiveHelloDuration(6), RangeError);
    assert.doesNotThrow(() => validateLiveHelloDuration(4));
  });

  test('recognises the buyer name regardless of punctuation and case', () => {
    // The name is what makes the greeting impossible to pre-record (§2.2), so
    // matching must not be defeated by ordinary speech-to-text noise.
    assert.ok(transcriptContainsBuyerName('Hey Alex, it is me!', 'Alex'));
    assert.ok(transcriptContainsBuyerName('hey   ALEX -- how are you', 'alex'));
    assert.ok(!transcriptContainsBuyerName('Hey there, it is me', 'Alex'));
    assert.ok(!transcriptContainsBuyerName('Hey Alex', ''), 'an empty name can never match');
  });
});

describe('Presence Seal', () => {
  const now = new Date('2026-09-20T12:00:00Z');

  test('reads as verified while fresh', () => {
    const seal = sealFor(new Date(now.getTime() - 40_000), now);
    assert.equal(seal.state, 'verified');
    assert.equal(seal.label, 'Presence verified 40 sec ago');
  });

  test('goes stale past the configured window', () => {
    const seal = sealFor(new Date(now.getTime() - (PRESENCE.sealStaleAfterSeconds + 60) * 1000), now);
    assert.equal(seal.state, 'stale');
  });

  test('never claims verification that did not happen', () => {
    const seal = sealFor(null, now);
    assert.equal(seal.state, 'unverified');
    assert.equal(seal.ageSeconds, null);
  });
});

describe('Presence Record', () => {
  test('counts one Live Hello per session, not per check', () => {
    const checks = [
      check({ sessionId: 's1', result: 'pass' }),
      check({ sessionId: 's2', result: 'pass' }),
      check({ sessionId: 's3', result: 'fail' }),
      check({ sessionId: 's4', type: 'recheck', result: 'fail' }), // re-checks are not sessions
    ];
    const r = presenceRecord(checks);
    assert.equal(r.totalSessions, 3);
    assert.equal(r.sessionsVerifiedPct, 67);
  });

  test('a creator with no sessions shows zero rather than dividing by zero', () => {
    assert.deepEqual(presenceRecord([]), { sessionsVerifiedPct: 0, totalSessions: 0 });
  });
});

describe('guarantee claim triage', () => {
  const ok = { filedWithinWindow: true, buyerClaimsLast30Days: 0, buyerGuaranteeEligible: true };

  test('auto-refunds when the Live Hello is missing or failed', () => {
    assert.equal(triageClaim({ ...ok, liveHello: null, rechecks: [] }).resolution, 'auto_refund');
    assert.equal(triageClaim({ ...ok, liveHello: check({ result: 'fail' }), rechecks: [] }).resolution, 'auto_refund');
  });

  test('auto-refunds when an in-session re-check failed', () => {
    const r = triageClaim({ ...ok, liveHello: check(), rechecks: [check({ type: 'recheck', result: 'fail' })] });
    assert.equal(r.resolution, 'auto_refund');
  });

  test('a clean presence log goes to a human, never an automatic refund', () => {
    // §2.5: claims are resolved from presence logs, "not buyer assertion alone".
    // A clean log must not auto-refund, or the guarantee becomes abusable.
    const r = triageClaim({ ...ok, liveHello: check(), rechecks: [check({ type: 'recheck' })] });
    assert.equal(r.resolution, 'needs_review');
  });

  test('rejects claims outside the window or from ineligible accounts', () => {
    assert.equal(triageClaim({ ...ok, filedWithinWindow: false, liveHello: null, rechecks: [] }).resolution, 'auto_reject');
    assert.equal(
      triageClaim({ ...ok, buyerGuaranteeEligible: false, liveHello: null, rechecks: [] }).resolution,
      'auto_reject',
      'an ineligible account cannot claim even on a missing Live Hello',
    );
  });
});
