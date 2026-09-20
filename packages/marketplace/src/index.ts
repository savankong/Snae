import { CONCURRENCY, PRIME_TIME } from '@snae/config';

/**
 * Availability, Prime Time liquidity, and queueing (§9, FR-002/FR-012).
 *
 * The design premise from design/v2 governs here: with 10–25 part-time
 * creators, "available now" is empty most of the time. So availability is a
 * state on a card, never the organising promise of the page, and every empty
 * state has to convert to something — an alert, a booking, or an async
 * message — rather than dead-end.
 */

export type AvailabilityStatus = 'live' | 'in_session' | 'booking_only' | 'offline';

export interface Availability {
  creatorId: string;
  status: AvailabilityStatus;
  textEnabled: boolean;
  voiceEnabled: boolean;
  videoEnabled: boolean;
  startsAt: Date | null;
  /** Availability expires so a creator is never shown as live after she walks away. */
  expiresAt: Date | null;
}

/** Availability is only real while it has not expired (FR-002). */
export function effectiveStatus(a: Availability, now = new Date()): AvailabilityStatus {
  if (a.expiresAt && a.expiresAt <= now) return 'offline';
  if (a.startsAt && a.startsAt > now) return 'booking_only';
  return a.status;
}

export interface PrimeTimeWindow { label: string; tz: string; startHour: number; endHour: number }

/**
 * Is the marketplace "open"? Windows may wrap past midnight (e.g. 19:00–01:00),
 * which is the normal case for an evening window.
 */
export function isPrimeTime(now = new Date(), windows: readonly PrimeTimeWindow[] = PRIME_TIME.windows): boolean {
  return windows.some((w) => {
    const hour = hourInZone(now, w.tz);
    return w.startHour <= w.endHour
      ? hour >= w.startHour && hour < w.endHour
      : hour >= w.startHour || hour < w.endHour;
  });
}

export function hourInZone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hour12: false }).formatToParts(date);
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '0';
  // Intl can emit "24" for midnight in hour12:false; normalise it.
  return Number(hour) % 24;
}

/** When does the next window open? Drives the "opens in 2 hr" empty state. */
export function nextPrimeTimeOpening(now = new Date(), windows: readonly PrimeTimeWindow[] = PRIME_TIME.windows): Date | null {
  if (windows.length === 0) return null;
  for (let offset = 0; offset < 48; offset++) {
    const candidate = new Date(now.getTime() + offset * 3600_000);
    candidate.setUTCMinutes(0, 0, 0);
    if (candidate > now && isPrimeTime(candidate, windows)) return candidate;
  }
  return null;
}

/**
 * Server-side concurrency caps (§14, FR-008). These structurally remove the
 * chatter-team operating model — one person can only hold so many real
 * conversations, so the cap is a product truth, not a rate limit.
 */
export function canAcceptAnother(
  modality: 'voice' | 'text',
  current: { voice: number; text: number },
  caps: { voice: number; text: number } = CONCURRENCY,
): boolean {
  // A voice session occupies the creator entirely.
  if (modality === 'voice') return current.voice < caps.voice && current.text === 0;
  return current.voice === 0 && current.text < caps.text;
}

export interface QueueEntry {
  buyerId: string;
  creatorId: string;
  joinedAt: Date;
  /** Wallet funds pre-authorised on joining (§9). */
  heldMinor: number;
  /** Higher-standing buyers get queue priority (§3.2 buyer perks). */
  priority: number;
}

/**
 * Queue order: priority first, then arrival. Returns 1-based positions so the
 * UI can render "you're #2" directly.
 */
export function queuePositions(entries: QueueEntry[]): Array<QueueEntry & { position: number }> {
  return [...entries]
    .sort((a, b) => b.priority - a.priority || a.joinedAt.getTime() - b.joinedAt.getTime())
    .map((e, i) => ({ ...e, position: i + 1 }));
}

/**
 * Discovery ranking. §FR-001 and the design brief both insist ranking cannot
 * be bought — there is deliberately no paid-placement term in this function,
 * and the homepage says so out loud.
 */
export interface RankableCreator {
  creatorId: string;
  status: AvailabilityStatus;
  /** Seconds since her last passing presence check. */
  sealAgeSeconds: number | null;
  sessionsVerifiedPct: number;
  medianResponseSeconds: number | null;
  isFavorite: boolean;
  isFriendOfHome: boolean;
  lastActiveAt: Date | null;
}

export function rankCreators(list: RankableCreator[], now = new Date()): RankableCreator[] {
  return [...list].sort((a, b) => score(b, now) - score(a, now));
}

function score(c: RankableCreator, now: Date): number {
  let s = 0;
  // Availability dominates: someone you can talk to now beats everything else.
  s += { live: 1000, in_session: 600, booking_only: 300, offline: 0 }[c.status];
  // A fresh seal is the product's core claim, so it ranks.
  if (c.sealAgeSeconds !== null) s += Math.max(0, 200 - c.sealAgeSeconds / 5);
  s += c.sessionsVerifiedPct * 2;
  if (c.medianResponseSeconds !== null) s += Math.max(0, 120 - c.medianResponseSeconds / 10);
  // A buyer's own favourites and his Home Creator's picks surface first.
  if (c.isFavorite) s += 400;
  if (c.isFriendOfHome) s += 250;
  if (c.lastActiveAt) {
    const hoursIdle = (now.getTime() - c.lastActiveAt.getTime()) / 3600_000;
    s += Math.max(0, 100 - hoursIdle);
  }
  return s;
}
