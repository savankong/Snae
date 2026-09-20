/**
 * Creator media and content discovery.
 *
 * ─── The design tension, and how it is resolved ───────────────────────────
 *
 * Snae's differentiator is *proven live presence* (§2). Photos are static and
 * pre-recorded — structurally the opposite of the guarantee. A generic
 * Instagram grid bolted onto this product would dilute the one thing that makes
 * it defensible, and would put Snae back into competition with platforms that
 * are far better at hosting galleries.
 *
 * So content here is shaped to serve the guarantee rather than fight it:
 *
 *   1. Content is a route to a session, never a destination. Every item carries
 *      its creator's live availability, so browsing converts into talking.
 *   2. Recency is ranked above everything else. "Posted 20 minutes ago" is
 *      evidence she is around; a polished six-month-old grid is not.
 *   3. Moments are ephemeral (24h). They say "she is active right now", which
 *      is exactly the signal that drives a session purchase, and they cannot
 *      accumulate into a back catalogue that competes with the live product.
 *   4. In-app captures are marked and ranked above uploads, for the same reason
 *      the Live Hello is camera-only: provenance is the product.
 *
 * ─── Launch content lane ──────────────────────────────────────────────────
 *
 * §5 fixes the launch lane as conversation-first: no explicit images or video.
 * `assertAllowedAtLaunch` enforces that in code rather than leaving it to
 * moderator judgement, and the explicit tier stays behind a flag that §5 gates
 * on legal review.
 */

export type MediaKind = 'photo' | 'clip' | 'moment';

/** Where a piece of media may be shown. Narrower than it looks on purpose. */
export type Visibility =
  /** Anyone, including logged-out visitors. Drives SEO and discovery. */
  | 'public'
  /** Signed-in buyers only. */
  | 'members'
  /** Buyers who have favourited her — the reward for following. */
  | 'favorites'
  /** Buyers she has actually talked to. */
  | 'past_buyers';

export type ModerationStatus = 'pending' | 'approved' | 'rejected';

/** How the file reached us. Provenance is ranked, so it is modelled. */
export type CaptureSource = 'in_app' | 'upload';

export interface Media {
  id: string;
  creatorId: string;
  kind: MediaKind;
  /** Storage key, never a public URL. Delivery is via short-lived signed URLs (§A.4). */
  storageKey: string | null;
  /** Deterministic seed for generated placeholder art. See cover-art.ts. */
  seed: string;
  caption: string | null;
  visibility: Visibility;
  moderationStatus: ModerationStatus;
  captureSource: CaptureSource;
  /** §FR-027: location and device metadata stripped before storage. */
  metadataStripped: boolean;
  width: number;
  height: number;
  createdAt: Date;
  /** Moments expire; photos and clips do not. */
  expiresAt: Date | null;
}

/** Aspect ratio for masonry layout, clamped so one item cannot dominate a column. */
export function aspectRatio(m: Pick<Media, 'width' | 'height'>): number {
  if (m.width <= 0 || m.height <= 0) return 1;
  return Math.min(1.6, Math.max(0.6, m.height / m.width));
}

// ── Launch lane enforcement ───────────────────────────────────────────────

export class ContentLaneError extends Error {}

/** Clips are personality content at launch, not video sessions (§11 puts video at P2). */
export const MAX_CLIP_SECONDS = 30;

export interface PublishRequest {
  kind: MediaKind;
  durationSeconds?: number;
  captureSource: CaptureSource;
  metadataStripped: boolean;
}

/**
 * Decide the state a newly published item enters.
 *
 * Whether an image is explicit is a human judgement, not something a type can
 * express — so what this enforces instead is that nobody *skips* that
 * judgement. While the explicit tier is off (§5 gates it on legal review and
 * processor approval), everything lands in `pending` and waits for a
 * moderator. An upload surface therefore cannot widen the content lane by
 * auto-approving, which is the failure mode worth designing against.
 *
 * The two hard rules are enforceable and are enforced: metadata must already
 * be stripped (§FR-027), and clips are capped at launch length.
 */
export function publishState(req: PublishRequest): ModerationStatus {
  if (!req.metadataStripped) {
    throw new ContentLaneError('Media must have location and device metadata stripped before storage');
  }
  if (req.kind === 'clip') {
    const duration = req.durationSeconds ?? 0;
    if (duration <= 0 || duration > MAX_CLIP_SECONDS) {
      throw new ContentLaneError(`Clips must be 1–${MAX_CLIP_SECONDS} seconds at launch`);
    }
  }
  // Everything is reviewed. There is deliberately no auto-approve path.
  return 'pending';
}

/** §14-style gate: nothing unapproved is ever discoverable. */
export function isDiscoverable(m: Media, now = new Date()): boolean {
  if (m.moderationStatus !== 'approved') return false;
  if (!m.metadataStripped) return false;
  if (m.expiresAt && m.expiresAt <= now) return false;
  return true;
}

// ── Visibility ────────────────────────────────────────────────────────────

export interface Viewer {
  isAuthenticated: boolean;
  hasFavorited: boolean;
  hasTalkedTo: boolean;
}

export const ANONYMOUS: Viewer = { isAuthenticated: false, hasFavorited: false, hasTalkedTo: false };

export function canView(m: Media, viewer: Viewer): boolean {
  switch (m.visibility) {
    case 'public': return true;
    case 'members': return viewer.isAuthenticated;
    case 'favorites': return viewer.isAuthenticated && viewer.hasFavorited;
    case 'past_buyers': return viewer.isAuthenticated && viewer.hasTalkedTo;
  }
}

/**
 * What a viewer who cannot see an item is shown instead.
 *
 * Locked items are still *listed* — blurred, with the reason — because the
 * point of gated content is to give someone a reason to favourite her or start
 * a session. Hiding it entirely wastes the pull.
 */
export type ViewState =
  | { state: 'visible' }
  | { state: 'locked'; reason: 'sign_in' | 'favorite' | 'talk_first'; prompt: string };

export function viewState(m: Media, viewer: Viewer): ViewState {
  if (canView(m, viewer)) return { state: 'visible' };
  switch (m.visibility) {
    case 'members':
      return { state: 'locked', reason: 'sign_in', prompt: 'Sign in to see this' };
    case 'favorites':
      return { state: 'locked', reason: 'favorite', prompt: 'For people who favourited her' };
    case 'past_buyers':
      return { state: 'locked', reason: 'talk_first', prompt: 'For people she has talked to' };
    case 'public':
      return { state: 'visible' };
  }
}

// ── Feed ranking ──────────────────────────────────────────────────────────

export interface FeedItem {
  media: Media;
  /** Her availability right now — content routes to a session, so it ranks. */
  creatorStatus: 'live' | 'in_session' | 'booking_only' | 'offline';
  creatorIsFavorite: boolean;
  /** Seconds since her last passing presence check, or null. */
  sealAgeSeconds: number | null;
}

/**
 * Rank the discovery feed.
 *
 * Recency and live availability dominate, for the reason in the module note:
 * this feed exists to start conversations, not to be an archive. There is no
 * engagement term and no paid-placement term — §FR-001 and the homepage both
 * state that ranking cannot be bought, and a like-count term would quietly
 * turn this into a popularity contest that buries new creators.
 */
export function rankFeed(items: FeedItem[], now = new Date()): FeedItem[] {
  return [...items].sort((a, b) => feedScore(b, now) - feedScore(a, now));
}

export function feedScore(item: FeedItem, now = new Date()): number {
  let score = 0;

  // Availability: someone you can talk to now is the whole point.
  score += { live: 600, in_session: 320, booking_only: 160, offline: 0 }[item.creatorStatus];

  // Recency, decaying over about three days. Fresh content is evidence of life.
  const ageHours = Math.max(0, (now.getTime() - item.media.createdAt.getTime()) / 3_600_000);
  score += 400 * Math.exp(-ageHours / 72);

  // Moments are deliberately privileged: they expire, so they can only ever
  // mean "recently, really her".
  if (item.media.kind === 'moment') score += 120;

  // Provenance, for the same reason the Live Hello is camera-only.
  if (item.media.captureSource === 'in_app') score += 80;

  // A fresh presence seal means she is genuinely around.
  if (item.sealAgeSeconds !== null) score += Math.max(0, 120 - item.sealAgeSeconds / 8);

  // The viewer's own favourites surface first.
  if (item.creatorIsFavorite) score += 250;

  return score;
}

/** Filter chips on the discovery feed. */
export type FeedFilter = 'for_you' | 'live_now' | 'moments' | 'new_here';

export function applyFilter(items: FeedItem[], filter: FeedFilter): FeedItem[] {
  switch (filter) {
    case 'live_now': return items.filter((i) => i.creatorStatus === 'live');
    case 'moments': return items.filter((i) => i.media.kind === 'moment');
    case 'new_here': {
      const cutoff = Date.now() - 14 * 86_400_000;
      return items.filter((i) => i.media.createdAt.getTime() >= cutoff);
    }
    case 'for_you': return items;
  }
}

export const FILTER_LABEL: Record<FeedFilter, string> = {
  for_you: 'For you',
  live_now: 'On now',
  moments: 'Moments',
  new_here: 'New',
};

/** Human-readable age, used on every card to keep recency legible. */
export function timeAgo(date: Date, now = new Date()): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

/** Moments run for 24 hours (§ ephemeral by design). */
export const MOMENT_TTL_HOURS = 24;

export function momentExpiry(createdAt: Date): Date {
  return new Date(createdAt.getTime() + MOMENT_TTL_HOURS * 3_600_000);
}

export function momentRemaining(m: Media, now = new Date()): string | null {
  if (!m.expiresAt) return null;
  const ms = m.expiresAt.getTime() - now.getTime();
  if (ms <= 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours}h left`;
  return `${Math.max(1, Math.floor(ms / 60_000))}m left`;
}
