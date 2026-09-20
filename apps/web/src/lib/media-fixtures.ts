import type { Media, MediaKind, Visibility, CaptureSource } from '@snae/media';
import { momentExpiry } from '@snae/media';
import { CREATORS } from './fixtures';

/**
 * Sample creator content.
 *
 * Captions are placeholder, and no photographs are referenced — each item
 * carries a seed that `CoverArt` turns into generated artwork. Swapping in real
 * imagery means adding a `src` to these rows and nothing else.
 *
 * The mix is deliberate: mostly recent, mostly moments, because the feed's
 * whole argument is that content proves someone is around right now.
 */

const H = 3_600_000;

interface Seed {
  creatorSlug: string;
  kind: MediaKind;
  caption: string;
  visibility: Visibility;
  hoursAgo: number;
  source: CaptureSource;
  w: number;
  h: number;
}

const SEEDS: Seed[] = [
  { creatorSlug: 'sofia', kind: 'moment', caption: 'kettle on, phone charged. around til late', visibility: 'public', hoursAgo: 0.3, source: 'in_app', w: 1080, h: 1440 },
  { creatorSlug: 'sofia', kind: 'photo', caption: 'the good mug', visibility: 'public', hoursAgo: 26, source: 'upload', w: 1080, h: 1080 },
  { creatorSlug: 'sofia', kind: 'photo', caption: 'rain again. not complaining', visibility: 'favorites', hoursAgo: 52, source: 'upload', w: 1080, h: 1350 },
  { creatorSlug: 'maya', kind: 'moment', caption: 'gym done. talk to me while I stretch', visibility: 'public', hoursAgo: 1.2, source: 'in_app', w: 1080, h: 1440 },
  { creatorSlug: 'maya', kind: 'photo', caption: 'records I am not sorry about', visibility: 'public', hoursAgo: 19, source: 'upload', w: 1080, h: 810 },
  { creatorSlug: 'maya', kind: 'clip', caption: 'ten seconds of me being annoying', visibility: 'members', hoursAgo: 40, source: 'in_app', w: 1080, h: 1920 },
  { creatorSlug: 'june', kind: 'moment', caption: 'on for a bit if anyone wants a quiet one', visibility: 'public', hoursAgo: 0.6, source: 'in_app', w: 1080, h: 1440 },
  { creatorSlug: 'june', kind: 'photo', caption: 'finished it in one sitting', visibility: 'public', hoursAgo: 30, source: 'upload', w: 1080, h: 1080 },
  { creatorSlug: 'june', kind: 'photo', caption: 'soup weather', visibility: 'past_buyers', hoursAgo: 71, source: 'upload', w: 1080, h: 1350 },
  { creatorSlug: 'elle', kind: 'photo', caption: 'Thursday. same time.', visibility: 'public', hoursAgo: 8, source: 'upload', w: 1080, h: 1350 },
  { creatorSlug: 'elle', kind: 'photo', caption: 'studio light was doing something', visibility: 'favorites', hoursAgo: 46, source: 'upload', w: 1080, h: 810 },
  { creatorSlug: 'nia', kind: 'photo', caption: 'weekend starts in four hours', visibility: 'public', hoursAgo: 14, source: 'upload', w: 1080, h: 1080 },
  { creatorSlug: 'nia', kind: 'photo', caption: 'he does this every time I sit down', visibility: 'public', hoursAgo: 62, source: 'upload', w: 1080, h: 1440 },
  { creatorSlug: 'rae', kind: 'moment', caption: 'first night here. say something nice', visibility: 'public', hoursAgo: 2.4, source: 'in_app', w: 1080, h: 1440 },
  { creatorSlug: 'rae', kind: 'photo', caption: 'unpacking, slowly', visibility: 'public', hoursAgo: 22, source: 'upload', w: 1080, h: 1080 },
  { creatorSlug: 'rae', kind: 'photo', caption: 'coffee number three', visibility: 'members', hoursAgo: 58, source: 'upload', w: 1080, h: 810 },
];

const NOW = Date.UTC(2026, 8, 20, 3, 0, 0);

export const MEDIA: Media[] = SEEDS.map((s, i) => {
  const createdAt = new Date(NOW - s.hoursAgo * H);
  return {
    id: `m${i + 1}`,
    creatorId: CREATORS.find((c) => c.slug === s.creatorSlug)?.id ?? 'c1',
    kind: s.kind,
    storageKey: null,
    seed: `${s.creatorSlug}-${i}-${s.kind}`,
    caption: s.caption,
    visibility: s.visibility,
    moderationStatus: 'approved',
    captureSource: s.source,
    metadataStripped: true,
    width: s.w,
    height: s.h,
    createdAt,
    expiresAt: s.kind === 'moment' ? momentExpiry(createdAt) : null,
  };
});

export function mediaForCreator(creatorId: string): Media[] {
  return MEDIA.filter((m) => m.creatorId === creatorId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Live moments only — what the ring tray opens into. */
export function activeMoments(now = new Date()): Media[] {
  return MEDIA.filter((m) => m.kind === 'moment' && (!m.expiresAt || m.expiresAt > now))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Her newest approved item, used as the cover on a creator card. */
export function coverFor(creatorId: string): Media | undefined {
  return mediaForCreator(creatorId)[0];
}

/**
 * The demo viewer. Signed in, has favourited two creators, and has talked to
 * one — chosen so the feed shows all three locked states at once.
 */
export const DEMO_VIEWER = {
  isAuthenticated: true,
  favoriteCreatorIds: ['c1', 'c4'],
  talkedToCreatorIds: ['c1'],
};

export function viewerFor(creatorId: string) {
  return {
    isAuthenticated: DEMO_VIEWER.isAuthenticated,
    hasFavorited: DEMO_VIEWER.favoriteCreatorIds.includes(creatorId),
    hasTalkedTo: DEMO_VIEWER.talkedToCreatorIds.includes(creatorId),
  };
}
