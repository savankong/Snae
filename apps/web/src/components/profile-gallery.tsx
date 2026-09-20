import Link from 'next/link';
import { viewState, timeAgo, momentRemaining, aspectRatio, type Media, type Viewer } from '@snae/media';
import { CoverArt, hueForSeed } from './cover-art';
import { LiveDot, ShieldTick } from './presence';
import { Note, cx } from './primitives';

/**
 * A creator's gallery.
 *
 * Locked items stay in the grid, blurred, with the reason written on them —
 * that is the whole mechanism by which gated content earns a favourite or a
 * first conversation. Hiding them would remove the pull and leave the profile
 * looking emptier than it is.
 */
export function ProfileGallery({ media, creator, viewer, now }: {
  media: Media[];
  creator: { slug: string; displayName: string; hue: number };
  viewer: Viewer;
  now: Date;
}) {
  if (media.length === 0) {
    return (
      <div className="rounded-[20px] border border-hairline bg-surface p-8 text-center">
        <p className="text-[14.5px] text-ink-2">{creator.displayName} hasn&rsquo;t posted anything yet.</p>
      </div>
    );
  }

  const lockedCount = media.filter((m) => viewState(m, viewer).state === 'locked').length;

  return (
    <div>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {media.map((m) => {
          const state = viewState(m, viewer);
          const locked = state.state === 'locked';
          const remaining = momentRemaining(m, now);
          const shell = cx(
            'group relative block overflow-hidden rounded-[14px] border border-hairline',
            !locked && 'press transition-[border-color] hover:border-verified/40',
          );

          // A locked tile is not a link: there is nothing behind it for this
          // viewer, and an anchor to "#" would be a keyboard trap.
          const inner = (
                <div className="relative" style={{ aspectRatio: `1 / ${Math.min(1.25, aspectRatio(m))}` }}>
                  <CoverArt
                    seed={m.seed}
                    hue={hueForSeed(creator.slug)}
                    locked={locked}
                    rounded={false}
                    className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]"
                    alt={locked ? '' : (m.caption ?? `Post by ${creator.displayName}`)}
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ground/90 to-transparent" />

                  {m.kind === 'moment' && remaining && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-ground/75 px-1.5 py-0.5 text-[9.5px] font-medium text-live-soft backdrop-blur">
                      <LiveDot /> {remaining}
                    </span>
                  )}
                  {m.captureSource === 'in_app' && !locked && (
                    <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-ground/75 text-verified-soft backdrop-blur"
                          title="Captured in the app">
                      <ShieldTick className="h-3 w-3" />
                    </span>
                  )}

                  {locked ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 text-center">
                      <LockIcon />
                      <span className="text-[11px] font-medium text-ink-2">{state.prompt}</span>
                    </div>
                  ) : (
                    <div className="absolute inset-x-0 bottom-0 p-2">
                      {m.caption && <p className="line-clamp-1 text-[11.5px] text-ink-2">{m.caption}</p>}
                      <span className="text-[10px] text-ink-3">{timeAgo(m.createdAt, now)}</span>
                    </div>
                  )}
                </div>
          );

          return (
            <li key={m.id}>
              {locked
                ? <div className={shell}>{inner}</div>
                : <Link href={`/${creator.slug}/m/${m.id}`} className={shell}>{inner}</Link>}
            </li>
          );
        })}
      </ul>

      {lockedCount > 0 && (
        <Note>
          {lockedCount} {lockedCount === 1 ? 'post is' : 'posts are'} kept for people who favourited her or
          have talked to her.
        </Note>
      )}
    </div>
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
