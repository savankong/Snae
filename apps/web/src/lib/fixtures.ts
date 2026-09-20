import type { AvailabilityStatus } from '@snae/marketplace';
import type { Tier } from '@snae/standing';

/**
 * Sample marketplace data for local development and design review.
 *
 * Everything here is placeholder, per design/v2/README: names, prices, copy and
 * imagery must not ship. Launch imagery has to come from verified creators
 * under a model release covering this specific use. No photographs are
 * referenced from this file at all — cards render a generated gradient mark, so
 * nothing in the repo depicts an identifiable person as a creator.
 */

export interface CreatorFixture {
  id: string;
  slug: string;
  displayName: string;
  tagline: string;
  bio: string;
  status: AvailabilityStatus;
  foundingCreator: boolean;
  /** Seconds since her last passing presence check; null if never verified. */
  sealAgeSeconds: number | null;
  sessionsVerifiedPct: number;
  medianResponseSeconds: number | null;
  voicePerMinuteMinor: number;
  textPerMessageMinor: number;
  asyncMessageMinor: number;
  /** Next slot she is available, as an ISO-free human string for the comps. */
  nextSlot: string | null;
  /** Seven-day availability strip: "her usual nights" from the V2 design. */
  usualNights: boolean[];
  interests: string[];
  /** Hue seed for the generated avatar mark. */
  hue: number;
  friendSlugs: string[];
  queueLength: number;
}

export const CREATORS: CreatorFixture[] = [
  {
    id: 'c1', slug: 'sofia', displayName: 'Sofia', tagline: 'Slow talker. Long calls.',
    bio: 'I do all my own talking, always have. Evenings after 8, usually with a coffee going cold next to me.',
    status: 'live', foundingCreator: true, sealAgeSeconds: 40, sessionsVerifiedPct: 100,
    medianResponseSeconds: 45, voicePerMinuteMinor: 450, textPerMessageMinor: 150, asyncMessageMinor: 250,
    nextSlot: null, usualNights: [false, true, true, true, true, true, false],
    interests: ['Late nights', 'Films', 'Long calls'], hue: 332, friendSlugs: ['maya', 'june'], queueLength: 2,
  },
  {
    id: 'c2', slug: 'maya', displayName: 'Maya', tagline: 'Blunt, funny, quick.',
    bio: 'Straight talker. If you want someone to agree with everything you say, I am the wrong call.',
    status: 'in_session', foundingCreator: true, sealAgeSeconds: 12, sessionsVerifiedPct: 98,
    medianResponseSeconds: 30, voicePerMinuteMinor: 500, textPerMessageMinor: 200, asyncMessageMinor: 300,
    nextSlot: null, usualNights: [false, false, true, true, true, true, true],
    interests: ['Banter', 'Music', 'Gym'], hue: 268, friendSlugs: ['sofia', 'elle'], queueLength: 4,
  },
  {
    id: 'c3', slug: 'june', displayName: 'June', tagline: 'Soft voice, no rush.',
    bio: 'I like the quiet ones. Wind-down calls before bed are my favourite thing to do.',
    status: 'live', foundingCreator: false, sealAgeSeconds: 95, sessionsVerifiedPct: 96,
    medianResponseSeconds: 70, voicePerMinuteMinor: 400, textPerMessageMinor: 150, asyncMessageMinor: 250,
    nextSlot: null, usualNights: [true, false, false, true, true, true, true],
    interests: ['Wind-down', 'Books', 'Cooking'], hue: 200, friendSlugs: ['sofia'], queueLength: 0,
  },
  {
    id: 'c4', slug: 'elle', displayName: 'Elle', tagline: 'Back Thursday at 9.',
    bio: 'Two nights a week, properly present for both. I would rather do four good calls than twenty rushed ones.',
    status: 'booking_only', foundingCreator: true, sealAgeSeconds: 5400, sessionsVerifiedPct: 100,
    medianResponseSeconds: 120, voicePerMinuteMinor: 600, textPerMessageMinor: 250, asyncMessageMinor: 400,
    nextSlot: 'Thursday, 9:00pm', usualNights: [false, false, false, true, false, true, false],
    interests: ['Deep talks', 'Art', 'Travel'], hue: 24, friendSlugs: ['maya', 'nia'], queueLength: 0,
  },
  {
    id: 'c5', slug: 'nia', displayName: 'Nia', tagline: 'Weekends only.',
    bio: 'Full-time job, so weekends are mine. I answer everything myself, even when it takes me a day.',
    status: 'offline', foundingCreator: false, sealAgeSeconds: 86_400, sessionsVerifiedPct: 94,
    medianResponseSeconds: 300, voicePerMinuteMinor: 380, textPerMessageMinor: 150, asyncMessageMinor: 200,
    nextSlot: 'Saturday, 8:00pm', usualNights: [true, false, false, false, false, true, true],
    interests: ['Weekends', 'Gaming', 'Dogs'], hue: 152, friendSlugs: ['elle'], queueLength: 0,
  },
  {
    id: 'c6', slug: 'rae', displayName: 'Rae', tagline: 'New here. Verified today.',
    bio: 'Just moved over. Same person you would have been talking to elsewhere, only here you can prove it.',
    status: 'offline', foundingCreator: false, sealAgeSeconds: 43_200, sessionsVerifiedPct: 100,
    medianResponseSeconds: null, voicePerMinuteMinor: 350, textPerMessageMinor: 150, asyncMessageMinor: 200,
    nextSlot: 'Tomorrow, 7:30pm', usualNights: [false, true, false, true, false, true, false],
    interests: ['New', 'Photography', 'Coffee'], hue: 300, friendSlugs: [], queueLength: 0,
  },
];

export function creatorBySlug(slug: string): CreatorFixture | undefined {
  return CREATORS.find((c) => c.slug === slug);
}

export function creatorById(id: string): CreatorFixture | undefined {
  return CREATORS.find((c) => c.id === id);
}

/** The signed-in buyer used across the demo surfaces. */
export const DEMO_BUYER = {
  id: 'b1',
  displayName: 'Alex',
  walletBalanceMinor: 4250,
  tier: 'trusted' as Tier,
  badges: ['no_disputes', 'verified_adult', 'regular_3mo'] as const,
  homeCreatorSlug: 'sofia',
  favoriteSlugs: ['sofia', 'elle'],
  ageVerified: true,
};

export const WALLET_HISTORY = [
  { id: 't1', label: 'Wallet top-up', sublabel: 'Visa ending 4242', amountMinor: 5000, at: 'Today, 8:12pm', kind: 'credit' as const },
  { id: 't2', label: 'Voice · Sofia', sublabel: '6 min at $4.50/min', amountMinor: -2700, at: 'Today, 8:31pm', kind: 'debit' as const },
  { id: 't3', label: 'Guarantee refund · Rae', sublabel: 'Live Hello did not pass', amountMinor: 1200, at: 'Mon, 10:04pm', kind: 'refund' as const },
  { id: 't4', label: 'Text · Maya', sublabel: '9 messages at $2.00', amountMinor: -1800, at: 'Sun, 9:47pm', kind: 'debit' as const },
  { id: 't5', label: 'Wallet top-up', sublabel: 'Visa ending 4242', amountMinor: 2500, at: 'Sun, 9:40pm', kind: 'credit' as const },
];

/** Creator-side earnings for the studio dashboard. */
export const CREATOR_EARNINGS = {
  clearedMinor: 48_230,
  pendingMinor: 12_400,
  reserveMinor: 5_360,
  lifetimeMinor: 214_900,
  nextPayout: 'Friday',
  payoutSpeed: 'Weekly',
  earningsPerAvailableHourMinor: 6_820,
  availableHoursThisWeek: 11.5,
  sessionsThisWeek: 23,
  recentSessions: [
    { id: 's1', buyer: 'Alex', tier: 'trusted' as Tier, modality: 'Voice', duration: '6 min', grossMinor: 2700, yourShareMinor: 2295, at: 'Today, 8:31pm', verified: true },
    { id: 's2', buyer: 'Dan', tier: 'good' as Tier, modality: 'Text', duration: '14 msgs', grossMinor: 2100, yourShareMinor: 1470, at: 'Today, 7:52pm', verified: true },
    { id: 's3', buyer: 'M.', tier: 'new' as Tier, modality: 'Voice', duration: '3 min', grossMinor: 1350, yourShareMinor: 945, at: 'Yesterday, 11:20pm', verified: true },
    { id: 's4', buyer: 'Chris', tier: 'top' as Tier, modality: 'Voice', duration: '22 min', grossMinor: 9900, yourShareMinor: 8415, at: 'Yesterday, 9:05pm', verified: true },
  ],
  regulars: [
    { name: 'Alex', tier: 'trusted' as Tier, sessions: 14, lastSeen: 'Today', spendTrend: 'steady' as const },
    { name: 'Chris', tier: 'top' as Tier, sessions: 31, lastSeen: 'Yesterday', spendTrend: 'up' as const },
    { name: 'Dan', tier: 'good' as Tier, sessions: 6, lastSeen: '3 days ago', spendTrend: 'steady' as const },
  ],
};

export const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
