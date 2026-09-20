import Link from 'next/link';
import { momentRemaining, timeAgo, type Media } from '@snae/media';
import { creatorById } from '@/lib/fixtures';
import { CoverArt, hueForSeed } from './cover-art';
import { LiveDot } from './presence';

/**
 * The moments rail.
 *
 * This replaces the plain avatar ring tray from the V2 design with something
 * that shows actual content. The ring still carries availability — pink for on
 * now, violet for posted today — but the thumbnail gives a reason to tap that
 * an initial in a circle never did.
 */
export function MomentsRail({ moments, now }: { moments: Media[]; now: Date }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-[17px] font-semibold tracking-tight">Moments</h2>
        <span className="text-[12px] text-ink-3">Gone in 24 hours</span>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex gap-3">
          {moments.map((m) => {
            const creator = creatorById(m.creatorId);
            if (!creator) return null;
            const live = creator.status === 'live';
            const remaining = momentRemaining(m, now);

            return (
              <li key={m.id} className="shrink-0">
                <Link href={`/${creator.slug}/m/${m.id}`} className="press block w-[124px]">
                  <div
                    className="relative rounded-[16px] p-[2px]"
                    style={{
                      background: live
                        ? 'conic-gradient(from 140deg, var(--color-live), color-mix(in srgb, var(--color-live) 25%, transparent), var(--color-live))'
                        : 'conic-gradient(from 140deg, var(--color-verified), color-mix(in srgb, var(--color-verified) 25%, transparent), var(--color-verified))',
                    }}
                  >
                    <div className="relative overflow-hidden rounded-[14px] bg-ground">
                      <CoverArt
                        seed={m.seed}
                        hue={hueForSeed(creator.slug)}
                        rounded={false}
                        className="h-[168px] w-full"
                        alt={m.caption ?? `Moment from ${creator.displayName}`}
                      />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ground to-transparent" />
                      {remaining && (
                        <span className="absolute right-1.5 top-1.5 rounded-full bg-ground/75 px-1.5 py-0.5 text-[9.5px] font-medium text-ink-2 backdrop-blur">
                          {remaining}
                        </span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-2">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[12px] font-semibold">{creator.displayName}</span>
                          {live && <LiveDot className="shrink-0" />}
                        </div>
                        <div className="text-[10px] text-ink-3">{timeAgo(m.createdAt, now)}</div>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
