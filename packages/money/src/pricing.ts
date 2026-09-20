import { assertNonNegative, type Minor } from './money';
import { PRICE_BOUNDS } from '@snae/config';

/**
 * Session pricing and metering. §15.3: "Never trust client-provided price,
 * payout, fee, referral rate, verification, or presence state." Every function
 * here takes the creator's *stored* offer, never a number from the browser,
 * and §A.2: "Do not rely on client timers for metered billing" — elapsed time
 * comes from provider events, which is why `meterVoice` takes explicit
 * server-observed timestamps rather than a duration.
 */

export type Modality = 'voice' | 'text' | 'async';
export type TextPricing = 'per_message' | 'block';

export interface VoiceOffer { modality: 'voice'; perMinuteMinor: Minor; minSeconds: number }
export interface TextOffer { modality: 'text'; pricing: TextPricing; amountMinor: Minor; blockSeconds?: number }
export interface AsyncOffer { modality: 'async'; amountMinor: Minor; replyWithinHours: number }
export type Offer = VoiceOffer | TextOffer | AsyncOffer;

/** Reject any offer outside the platform's price floors and ceilings (§7.1). */
export function validateOffer(offer: Offer): void {
  const b = PRICE_BOUNDS;
  if (offer.modality === 'voice') {
    inRange(offer.perMinuteMinor, b.voicePerMinuteMinor, 'voice per-minute rate');
    if (offer.minSeconds < b.minVoiceSessionSeconds) {
      throw new RangeError(`Minimum voice session is ${b.minVoiceSessionSeconds}s`);
    }
  } else if (offer.modality === 'text') {
    if (offer.pricing === 'per_message') inRange(offer.amountMinor, b.textPerMessageMinor, 'per-message price');
    else inRange(offer.amountMinor, b.textBlockMinor, 'text block price');
  } else {
    inRange(offer.amountMinor, b.asyncMessageMinor, 'async message price');
  }
}

function inRange(v: Minor, bound: { min: number; max: number }, label: string): void {
  if (v < bound.min || v > bound.max) {
    throw new RangeError(`${label} ${v} is outside platform bounds ${bound.min}..${bound.max}`);
  }
}

/**
 * Meter a voice session from server-observed start/end timestamps.
 *
 * Billing starts only after a passing Live Hello (§14), so `billingStartedAt`
 * is the Live Hello pass time, not the time the call connected. Paused
 * intervals (a failed re-check pauses billing, §14) are subtracted.
 */
export interface MeterVoiceInput {
  offer: VoiceOffer;
  billingStartedAt: Date;
  endedAt: Date;
  /** Server-recorded windows where billing was paused by a failed re-check. */
  pausedIntervals?: Array<{ from: Date; to: Date }>;
}

export function meterVoice(input: MeterVoiceInput): { billableSeconds: number; grossMinor: Minor } {
  const rawMs = input.endedAt.getTime() - input.billingStartedAt.getTime();
  if (rawMs < 0) throw new RangeError('Session ended before billing started');

  const pausedMs = (input.pausedIntervals ?? []).reduce((acc, p) => {
    const ms = p.to.getTime() - p.from.getTime();
    if (ms < 0) throw new RangeError('Paused interval ends before it begins');
    return acc + ms;
  }, 0);

  const netMs = Math.max(0, rawMs - pausedMs);
  // The minimum is charged even on a short call, but only once billing began.
  const billableSeconds = Math.max(Math.ceil(netMs / 1000), input.offer.minSeconds);
  // Bill per whole minute started — the standard for per-minute voice.
  const minutes = Math.ceil(billableSeconds / 60);
  return { billableSeconds, grossMinor: minutes * input.offer.perMinuteMinor };
}

/** Per-message text billing. Only messages the buyer sends are billable. */
export function meterTextPerMessage(offer: TextOffer, billableMessageCount: number): Minor {
  if (offer.pricing !== 'per_message') throw new Error('Offer is not per-message priced');
  assertNonNegative(billableMessageCount, 'billableMessageCount');
  return offer.amountMinor * billableMessageCount;
}

/** Prepaid text block: a flat price for a fixed window, charged up front. */
export function priceTextBlock(offer: TextOffer): Minor {
  if (offer.pricing !== 'block') throw new Error('Offer is not block priced');
  return offer.amountMinor;
}

/**
 * Funds a session must reserve before it can start. The wallet is held, not
 * debited — the draw-down happens on settlement from actual metered usage.
 */
export function reservationFor(offer: Offer): Minor {
  if (offer.modality === 'voice') {
    const minutes = Math.ceil(offer.minSeconds / 60);
    return minutes * offer.perMinuteMinor;
  }
  if (offer.modality === 'text') {
    return offer.pricing === 'block' ? offer.amountMinor : offer.amountMinor * 10;
  }
  return offer.amountMinor;
}

/** Can this buyer afford to start? Checked server-side on every session create. */
export function canAfford(walletBalanceMinor: Minor, offer: Offer): boolean {
  return walletBalanceMinor >= reservationFor(offer);
}
