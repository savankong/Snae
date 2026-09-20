/**
 * Marketplace configuration. Every number here is admin-configurable per
 * spec §7.2 / A.5 — nothing that affects money is hard-coded at a call site.
 * In production these are loaded from the settings table and cached; the
 * literals below are the launch defaults.
 */

export const TAKE_RATES = {
  /** Buyer the creator brought through her own link. */
  creatorBrought: { standard: 0.80, founding: 0.85 },
  /** Buyer the marketplace acquired. */
  marketplace: { standard: 0.70, founding: 0.75 },
} as const;

/** Cross-creator commission, paid from platform share (§8). */
export const REFERRAL = {
  commissionRate: 0.05,
  /** Home Creator attribution window. */
  windowDays: 180,
  /** No cross-creator recommendations during, or within this window after,
   *  a session with the Home Creator (§14). */
  noPoachCooldownMinutes: 30,
  maxFriends: 5,
} as const;

/** Server-enforced concurrency caps (§14, FR-008). */
export const CONCURRENCY = { voice: 1, text: 3 } as const;

/** Platform price floors and ceilings protect premium positioning (§7.1). */
export const PRICE_BOUNDS = {
  voicePerMinuteMinor: { min: 150, max: 1500 },
  textPerMessageMinor: { min: 50, max: 500 },
  textBlockMinor: { min: 1000, max: 10000 },
  minVoiceSessionSeconds: 120,
  asyncMessageMinor: { min: 150, max: 1000 },
} as const;

export const WALLET = {
  topUpPresetsMinor: [2500, 5000, 10000, 25000] as const,
  customMinMinor: 1000,
  customMaxMinor: 50000,
} as const;

/** Proof of Presence thresholds (§2.5, §20). */
export const PRESENCE = {
  liveHelloMinSeconds: 3,
  liveHelloMaxSeconds: 5,
  /** Target p50 for the Live Hello round trip — a launch gate. */
  liveHelloTargetMs: 5000,
  /** Base re-check cadence for text sessions; risk signals shorten it. */
  recheckBaseIntervalSeconds: 420,
  recheckMinIntervalSeconds: 120,
  /** Two consecutive failures end the session and refund (§14). */
  maxConsecutiveRecheckFailures: 2,
  /** Seal goes stale in the UI after this long without a passing check. */
  sealStaleAfterSeconds: 900,
} as const;

/** Guarantee claim policy (§12.3, §21). */
export const GUARANTEE = {
  claimWindowHours: 24,
  maxClaimsPer30Days: 3,
} as const;

/** Prime Time liquidity windows (§9). Stored as UTC offsets from config. */
export const PRIME_TIME = {
  windows: [{ label: 'ET evening', tz: 'America/New_York', startHour: 19, endHour: 1 }],
} as const;

/** Feature flags gate payments, presence, voice and ranking (A.8). */
export const FLAGS = {
  payments: true,
  voice: true,
  text: true,
  video: false,
  explicitTier: false,
  voiceprintMatch: false,
  affiliates: false,
  standingAppointments: false,
  acceleratedPayouts: false,
} as const;

export type BuyerSource = 'creator' | 'marketplace';
