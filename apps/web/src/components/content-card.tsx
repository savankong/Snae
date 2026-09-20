import Link from 'next/link';
import { aspectRatio, timeAgo, viewState, momentRemaining, type Media, type Viewer } from '@snae/media';
import type { CreatorFixture } from '@/lib/fixtures';
import { CoverArt, hueForSeed } from './cover-art';
import { LiveDot, ShieldTick } from './presence';
import { cx } from './primitives';

/**
 * A single piece of content in the discovery feed.
 *
 * Every card carries three things beyond the image, and each is load-bearing:
 * who made it, how long ago, and whether she is available right now. That last
 * one is why this exists — content here is a route into a conversation, not an
 * archive to scroll.
 *
 * Locked items are shown blurred rather than hidden, because the pull of gated
 * content is the reason to favourite her.
 */
export function ContentCard({ media, creator, viewer, now, priority }: {
  media: Media;
  creator: CreatorFixture;
  viewer: Viewer;
  now: Date;
  priority?: boolean;
}) {
  const state = viewState(media, viewer);
  const locked = state.state === 'locked';
  const ratio = aspectRatio(media);
  const remaining = momentRemaining(media, now);
  const href = locked ? `/${creator.slug}` : `/${creator.slug}/m/${media.id}`;

  return (
    <Link
      href={href}
      className="group press relative block overflow-hidden rounded-[18px] border border-hairline bg-surface transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-verified/40"
    >
      <div className="relative" style={{ aspectRatio: `1 / ${ratio}` }}>
        <CoverArt
          seed={media.seed}
          hue={hueForSeed(creator.slug)}
          locked={locked}
          rounded={false}
          className="h-full w-full"
          alt={locked ? '' : (media.caption ?? `Post by ${creator.displayName}`)}
        />

        {/* Legibility scrim — the caption sits on artwork, so it needs one. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-ground via-ground/70 to-transparent" />

        {/* Moment countdown, top-left: the ephemerality is the point. */}
        {media.kind === 'moment' && remaining && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-ground/75 px-2 py-1 text-[10.5px] font-medium text-live-soft backdrop-blur">
            <LiveDot /> {remaining}
          </span>
        )}

        {/* Provenance, top-right. Same argument as the Live Hello being camera-only. */}
        {media.captureSource === 'in_app' && !locked && (
          <span
            className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full bg-ground/75 text-verified-soft backdrop-blur"
            title="Captured in the app, not uploaded"
          >
            <ShieldTick className="h-3.5 w-3.5" />
          </span>
        )}

        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-ground/70 backdrop-blur">
              <LockIcon />
            </span>
            <span className="text-[12px] font-medium text-ink-2">{state.prompt}</span>
          </div>
        )}

        {/* Caption + attribution */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          {!locked && media.caption && (
            <p className="mb-2 line-clamp-2 text-[13px] leading-snug text-ink">{media.caption}</p>
          )}
          <div className="flex items-center gap-2">
            <span
              className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white/90"
              style={{ background: `linear-gradient(145deg, hsl(${creator.hue} 72% 52%), hsl(${(creator.hue + 46) % 360} 68% 38%))` }}
            >
              {creator.displayName.slice(0, 1)}
            </span>
            <span className="truncate text-[12px] font-medium text-ink-2">{creator.displayName}</span>
            {creator.status === 'live' && <LiveDot className="shrink-0" />}
            <span className="ml-auto shrink-0 text-[11px] text-ink-3">{timeAgo(media.createdAt, now)}</span>
          </div>
        </div>
      </div>

      {/* The conversion affordance. Content exists to start sessions. */}
      {creator.status === 'live' && !locked && (
        <div className="flex items-center justify-between gap-2 border-t border-hairline px-3 py-2.5">
          <span className="text-[11.5px] text-live-soft">She&rsquo;s on now</span>
          <span className="rounded-full bg-live px-2.5 py-1 text-[11.5px] font-semibold text-white">Talk</span>
        </div>
      )}
    </Link>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-2" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Masonry columns.
 *
 * CSS `columns` would be one line, but it orders items top-to-bottom per
 * column, so a recency-ranked feed would read out of order. Distributing into
 * explicit columns keeps rank order left-to-right across the first row, which
 * is how people actually scan a grid.
 */
export function masonryColumns<T>(items: T[], columnCount: number): T[][] {
  const columns: T[][] = Array.from({ length: columnCount }, () => []);
  items.forEach((item, i) => columns[i % columnCount]!.push(item));
  return columns;
}
