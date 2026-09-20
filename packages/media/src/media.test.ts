import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  canView, viewState, isDiscoverable, rankFeed, feedScore, applyFilter,
  publishState, momentExpiry, momentRemaining, timeAgo, aspectRatio,
  ContentLaneError, MAX_CLIP_SECONDS, MOMENT_TTL_HOURS,
  ANONYMOUS, type Media, type Viewer, type FeedItem,
} from './index.ts';

const NOW = new Date('2026-09-20T12:00:00Z');

const media = (over: Partial<Media> = {}): Media => ({
  id: 'm1', creatorId: 'c1', kind: 'photo', storageKey: null, seed: 's',
  caption: null, visibility: 'public', moderationStatus: 'approved',
  captureSource: 'upload', metadataStripped: true,
  width: 1080, height: 1080, createdAt: NOW, expiresAt: null, ...over,
});

const viewer = (over: Partial<Viewer> = {}): Viewer => ({
  isAuthenticated: true, hasFavorited: false, hasTalkedTo: false, ...over,
});

describe('discoverability gates', () => {
  test('unapproved media is never discoverable', () => {
    assert.equal(isDiscoverable(media({ moderationStatus: 'pending' }), NOW), false);
    assert.equal(isDiscoverable(media({ moderationStatus: 'rejected' }), NOW), false);
    assert.equal(isDiscoverable(media(), NOW), true);
  });

  test('media with metadata still attached is never discoverable', () => {
    // §FR-027: location and device metadata stripped before storage. This is
    // a hard gate, not a moderation preference.
    assert.equal(isDiscoverable(media({ metadataStripped: false }), NOW), false);
  });

  test('an expired moment drops out of discovery', () => {
    const expired = media({ kind: 'moment', expiresAt: new Date(NOW.getTime() - 1000) });
    assert.equal(isDiscoverable(expired, NOW), false);
    const live = media({ kind: 'moment', expiresAt: new Date(NOW.getTime() + 1000) });
    assert.equal(isDiscoverable(live, NOW), true);
  });
});

describe('visibility', () => {
  test('public media is visible to anonymous visitors', () => {
    // FR-001: anonymous visitors can browse. Discovery must work logged out.
    assert.equal(canView(media({ visibility: 'public' }), ANONYMOUS), true);
  });

  test('every other tier is closed to anonymous visitors', () => {
    for (const v of ['members', 'favorites', 'past_buyers'] as const) {
      assert.equal(canView(media({ visibility: v }), ANONYMOUS), false, v);
    }
  });

  test('favorites tier needs an actual favourite, not just a login', () => {
    const m = media({ visibility: 'favorites' });
    assert.equal(canView(m, viewer()), false);
    assert.equal(canView(m, viewer({ hasFavorited: true })), true);
  });

  test('past_buyers tier needs a real session, and a favourite does not substitute', () => {
    const m = media({ visibility: 'past_buyers' });
    assert.equal(canView(m, viewer({ hasFavorited: true })), false, 'favouriting is not talking');
    assert.equal(canView(m, viewer({ hasTalkedTo: true })), true);
  });

  test('locked items report why, so the UI can prompt correctly', () => {
    assert.equal(viewState(media({ visibility: 'members' }), ANONYMOUS).state, 'locked');
    const fav = viewState(media({ visibility: 'favorites' }), viewer());
    assert.equal(fav.state === 'locked' && fav.reason, 'favorite');
    const past = viewState(media({ visibility: 'past_buyers' }), viewer());
    assert.equal(past.state === 'locked' && past.reason, 'talk_first');
    assert.equal(viewState(media(), ANONYMOUS).state, 'visible');
  });
});

describe('publishing', () => {
  test('refuses media that has not had metadata stripped', () => {
    assert.throws(
      () => publishState({ kind: 'photo', captureSource: 'upload', metadataStripped: false }),
      ContentLaneError,
    );
  });

  test('caps clip length at the launch limit', () => {
    const base = { kind: 'clip' as const, captureSource: 'in_app' as const, metadataStripped: true };
    assert.throws(() => publishState({ ...base, durationSeconds: MAX_CLIP_SECONDS + 1 }), ContentLaneError);
    assert.throws(() => publishState({ ...base, durationSeconds: 0 }), ContentLaneError);
    assert.equal(publishState({ ...base, durationSeconds: 12 }), 'pending');
  });

  test('there is no auto-approve path', () => {
    // §5 gates the explicit tier on legal review. Everything is reviewed, so an
    // upload surface cannot widen the content lane without a moderator.
    for (const kind of ['photo', 'moment'] as const) {
      assert.equal(
        publishState({ kind, captureSource: 'in_app', metadataStripped: true }),
        'pending',
      );
    }
  });
});

describe('moments', () => {
  test('expire 24 hours after creation', () => {
    const created = new Date('2026-09-20T09:00:00Z');
    const expiry = momentExpiry(created);
    assert.equal((expiry.getTime() - created.getTime()) / 3_600_000, MOMENT_TTL_HOURS);
  });

  test('report remaining time, and null once gone', () => {
    const soon = media({ kind: 'moment', expiresAt: new Date(NOW.getTime() + 5 * 3_600_000) });
    assert.equal(momentRemaining(soon, NOW), '5h left');
    const expired = media({ kind: 'moment', expiresAt: new Date(NOW.getTime() - 1) });
    assert.equal(momentRemaining(expired, NOW), null);
    assert.equal(momentRemaining(media(), NOW), null, 'a photo has no countdown');
  });
});

describe('feed ranking', () => {
  const item = (over: {
    media?: Partial<Media>;
    creatorStatus?: FeedItem['creatorStatus'];
    creatorIsFavorite?: boolean;
    sealAgeSeconds?: number | null;
  } = {}): FeedItem => ({
    media: media(over.media),
    creatorStatus: over.creatorStatus ?? 'offline',
    creatorIsFavorite: over.creatorIsFavorite ?? false,
    sealAgeSeconds: over.sealAgeSeconds ?? null,
  });

  test('a live creator outranks an offline one with identical content', () => {
    const ranked = rankFeed([
      item({ media: { id: 'off' }, creatorStatus: 'offline' }),
      item({ media: { id: 'live' }, creatorStatus: 'live' }),
    ], NOW);
    assert.equal(ranked[0]!.media.id, 'live');
  });

  test('recent content outranks old content from the same creator', () => {
    const ranked = rankFeed([
      item({ media: { id: 'old', createdAt: new Date(NOW.getTime() - 96 * 3_600_000) } }),
      item({ media: { id: 'fresh', createdAt: new Date(NOW.getTime() - 3_600_000) } }),
    ], NOW);
    assert.equal(ranked[0]!.media.id, 'fresh');
  });

  test('moments and in-app captures are privileged over uploads', () => {
    const upload = feedScore(item({ media: { captureSource: 'upload' } }), NOW);
    const inApp = feedScore(item({ media: { captureSource: 'in_app' } }), NOW);
    const moment = feedScore(item({ media: { kind: 'moment' } }), NOW);
    assert.ok(inApp > upload, 'provenance ranks');
    assert.ok(moment > upload, 'ephemerality ranks');
  });

  test("a viewer's favourites surface first", () => {
    const ranked = rankFeed([
      item({ media: { id: 'stranger' } }),
      item({ media: { id: 'favorite' }, creatorIsFavorite: true }),
    ], NOW);
    assert.equal(ranked[0]!.media.id, 'favorite');
  });

  test('ranking does not mutate the input', () => {
    const items = [item({ media: { id: 'a' } }), item({ media: { id: 'b' }, creatorStatus: 'live' })];
    const before = items.map((i) => i.media.id);
    rankFeed(items, NOW);
    assert.deepEqual(items.map((i) => i.media.id), before);
  });

  test('score has no engagement or paid-placement term', () => {
    // FR-001 and the homepage both state ranking cannot be bought. Two items
    // identical except for identity must score identically — if a popularity
    // or payment term were ever added, this fails.
    const a = feedScore(item({ media: { id: 'a' } }), NOW);
    const b = feedScore(item({ media: { id: 'b' } }), NOW);
    assert.equal(a, b);
  });
});

describe('filters', () => {
  const items: FeedItem[] = [
    { media: media({ id: 'live-photo' }), creatorStatus: 'live', creatorIsFavorite: false, sealAgeSeconds: 10 },
    { media: media({ id: 'moment', kind: 'moment' }), creatorStatus: 'offline', creatorIsFavorite: false, sealAgeSeconds: null },
    { media: media({ id: 'old', createdAt: new Date(NOW.getTime() - 30 * 86_400_000) }), creatorStatus: 'offline', creatorIsFavorite: false, sealAgeSeconds: null },
  ];

  test('live_now keeps only available creators', () => {
    assert.deepEqual(applyFilter(items, 'live_now').map((i) => i.media.id), ['live-photo']);
  });

  test('moments keeps only moments', () => {
    assert.deepEqual(applyFilter(items, 'moments').map((i) => i.media.id), ['moment']);
  });

  test('new_here drops anything older than two weeks', () => {
    assert.ok(!applyFilter(items, 'new_here').some((i) => i.media.id === 'old'));
  });

  test('for_you keeps everything', () => {
    assert.equal(applyFilter(items, 'for_you').length, items.length);
  });
});

describe('layout helpers', () => {
  test('aspect ratio is clamped so one tile cannot dominate a column', () => {
    assert.equal(aspectRatio({ width: 1000, height: 5000 }), 1.6);
    assert.equal(aspectRatio({ width: 5000, height: 1000 }), 0.6);
    assert.equal(aspectRatio({ width: 1000, height: 1000 }), 1);
    assert.equal(aspectRatio({ width: 0, height: 0 }), 1, 'never divides by zero');
  });

  test('timeAgo reads naturally at each scale', () => {
    assert.equal(timeAgo(new Date(NOW.getTime() - 30_000), NOW), 'just now');
    assert.equal(timeAgo(new Date(NOW.getTime() - 5 * 60_000), NOW), '5m ago');
    assert.equal(timeAgo(new Date(NOW.getTime() - 3 * 3_600_000), NOW), '3h ago');
    assert.equal(timeAgo(new Date(NOW.getTime() - 26 * 3_600_000), NOW), 'yesterday');
    assert.equal(timeAgo(new Date(NOW.getTime() - 5 * 86_400_000), NOW), '5d ago');
  });
});
