import { PRESENCE } from '@snae/config';

/**
 * Proof of Presence (§2.2). This module owns the answer to the only question
 * the buyer is actually paying for: "is she the one talking to me, right now?"
 *
 * It deliberately holds no biometric data. Raw captures go straight to the
 * verification provider; Snae stores only the provider's verdict and a
 * reference (§16 biometric privacy — BIPA and similar). Nothing in this file
 * should ever accept or return an image, audio buffer, or biometric template.
 */

export type CheckType = 'live_hello' | 'recheck' | 'device';
export type CheckResult = 'pass' | 'fail' | 'pending' | 'error';

export interface PresenceCheck {
  id: string;
  sessionId: string | null;
  creatorId: string;
  type: CheckType;
  /** Opaque reference into the verification provider. Never a biometric. */
  providerRef: string | null;
  result: CheckResult;
  riskSignals: RiskSignals;
  createdAt: Date;
}

/**
 * Signals that shorten the re-check interval (§2.2 in-session re-checks).
 * All are behavioural or device-level — none identify a person.
 */
export interface RiskSignals {
  deviceChanged?: boolean;
  concurrentSessionSpike?: boolean;
  /** Typing cadence far from this creator's own baseline. */
  typingCadenceAnomaly?: boolean;
  /** A high share of messages arriving as clipboard pastes. */
  pastePatternDetected?: boolean;
  /** Buyer has filed a claim in this session. */
  claimFiled?: boolean;
}

/** Weight per signal. Tuning these is a P1 task (§11), so they live in one place. */
const RISK_WEIGHTS: Record<keyof RiskSignals, number> = {
  deviceChanged: 0.45,
  concurrentSessionSpike: 0.3,
  typingCadenceAnomaly: 0.25,
  pastePatternDetected: 0.35,
  claimFiled: 0.6,
};

/** Combined risk in 0..1. Independent signals compound rather than sum past 1. */
export function riskScore(signals: RiskSignals): number {
  let surviving = 1;
  for (const [key, weight] of Object.entries(RISK_WEIGHTS) as Array<[keyof RiskSignals, number]>) {
    if (signals[key]) surviving *= 1 - weight;
  }
  return Number((1 - surviving).toFixed(4));
}

/**
 * When should the next text re-check fire?
 *
 * Re-checks are "silent and risk-weighted, not constant" (§2.5) — creator
 * friction is the main cost of the whole mechanism, so a clean session drifts
 * toward the base interval while a risky one tightens to the floor.
 */
export function nextRecheckDelaySeconds(signals: RiskSignals): number {
  const risk = riskScore(signals);
  const { recheckBaseIntervalSeconds: base, recheckMinIntervalSeconds: min } = PRESENCE;
  return Math.round(base - (base - min) * risk);
}

/** Is a Live Hello capture the right length? Enforced before the provider call. */
export function validateLiveHelloDuration(seconds: number): void {
  if (seconds < PRESENCE.liveHelloMinSeconds || seconds > PRESENCE.liveHelloMaxSeconds) {
    throw new RangeError(
      `Live Hello must be ${PRESENCE.liveHelloMinSeconds}–${PRESENCE.liveHelloMaxSeconds}s, got ${seconds}s`,
    );
  }
}

/**
 * The Live Hello must contain the buyer's display name — that is what makes it
 * impossible to pre-record (§2.2). The transcript check is a cheap guard in
 * front of the provider's liveness/match verdict, not a replacement for it.
 */
export function transcriptContainsBuyerName(transcript: string, buyerDisplayName: string): boolean {
  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  const name = normalise(buyerDisplayName);
  if (!name) return false;
  return normalise(transcript).includes(name);
}

export type BillingGate =
  | { canBill: true }
  | { canBill: false; reason: 'no_live_hello' | 'live_hello_pending' | 'live_hello_failed' };

/**
 * §14: "No paid session bills before a passing Live Hello."
 * This is the single gate every billing path must pass through.
 */
export function billingGate(liveHello: PresenceCheck | null | undefined): BillingGate {
  if (!liveHello) return { canBill: false, reason: 'no_live_hello' };
  if (liveHello.result === 'pending') return { canBill: false, reason: 'live_hello_pending' };
  if (liveHello.result !== 'pass') return { canBill: false, reason: 'live_hello_failed' };
  return { canBill: true };
}

export type SessionAction = 'continue' | 'pause_billing' | 'end_and_refund';

/**
 * §14: "A failed in-session re-check pauses billing; two consecutive failures
 * end the session and trigger automatic refund of the affected portion."
 */
export function onRecheckResult(consecutiveFailures: number, result: CheckResult): SessionAction {
  if (result === 'pass') return 'continue';
  // A provider error is not the creator's fault; treat it as a pause, not a violation.
  const failures = consecutiveFailures + 1;
  return failures >= PRESENCE.maxConsecutiveRecheckFailures ? 'end_and_refund' : 'pause_billing';
}

export type SealState = 'verified' | 'stale' | 'unverified';

export interface Seal {
  state: SealState;
  /** Seconds since the last passing check, or null if there has never been one. */
  ageSeconds: number | null;
  /** Ready-to-render copy: "Presence verified 40 sec ago" (§2.2). */
  label: string;
}

/** The Presence Seal shown on every creator card and conversation (FR-006). */
export function sealFor(lastPassAt: Date | null, now = new Date()): Seal {
  if (!lastPassAt) return { state: 'unverified', ageSeconds: null, label: 'Not yet verified' };
  const ageSeconds = Math.max(0, Math.floor((now.getTime() - lastPassAt.getTime()) / 1000));
  const state: SealState = ageSeconds <= PRESENCE.sealStaleAfterSeconds ? 'verified' : 'stale';
  return { state, ageSeconds, label: `Presence verified ${humanizeAge(ageSeconds)} ago` };
}

function humanizeAge(s: number): string {
  if (s < 60) return `${s} sec`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr`;
  return `${Math.floor(s / 86400)} d`;
}

/** The Presence Record on a profile (FR-006): % of sessions verified. */
export function presenceRecord(checks: PresenceCheck[]): {
  sessionsVerifiedPct: number;
  totalSessions: number;
} {
  const helloBySession = new Map<string, CheckResult>();
  for (const c of checks) {
    if (c.type === 'live_hello' && c.sessionId) helloBySession.set(c.sessionId, c.result);
  }
  const total = helloBySession.size;
  if (total === 0) return { sessionsVerifiedPct: 0, totalSessions: 0 };
  const passed = [...helloBySession.values()].filter((r) => r === 'pass').length;
  return { sessionsVerifiedPct: Math.round((passed / total) * 100), totalSessions: total };
}

export type ClaimResolution = 'auto_refund' | 'auto_reject' | 'needs_review';

/**
 * Guarantee claim triage (§12.3). Claims are "resolved from presence logs, not
 * buyer assertion alone" (§2.5) — so a session with a clean presence record
 * does not auto-refund, it goes to a human.
 */
export function triageClaim(input: {
  liveHello: PresenceCheck | null;
  rechecks: PresenceCheck[];
  filedWithinWindow: boolean;
  buyerClaimsLast30Days: number;
  buyerGuaranteeEligible: boolean;
}): { resolution: ClaimResolution; reason: string } {
  if (!input.filedWithinWindow) {
    return { resolution: 'auto_reject', reason: 'Filed outside the 24-hour claim window' };
  }
  if (!input.buyerGuaranteeEligible) {
    return { resolution: 'auto_reject', reason: 'Account is not eligible for guarantee claims' };
  }
  // Failed or missing checks refund automatically (§12.3).
  if (!input.liveHello || input.liveHello.result !== 'pass') {
    return { resolution: 'auto_refund', reason: 'Live Hello missing or did not pass' };
  }
  if (input.rechecks.some((r) => r.result === 'fail')) {
    return { resolution: 'auto_refund', reason: 'An in-session presence re-check failed' };
  }
  // Presence is clean, so this needs a human. Volume is a review signal, not a rejection.
  return {
    resolution: 'needs_review',
    reason: 'All presence checks passed; moderator review required',
  };
}
