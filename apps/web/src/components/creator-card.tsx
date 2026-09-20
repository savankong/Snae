import Link from 'next/link';
import { formatUsd, formatUsdCompact } from '@snae/money';
import type { CreatorFixture } from '@/lib/fixtures';
import { DAY_LABELS } from '@/lib/fixtures';
import { timeAgo } from '@snae/media';
import { coverFor } from '@/lib/media-fixtures';
import { CoverArt, hueForSeed } from './cover-art';
import { AvatarMark, PresenceSeal, StatusPill } from './presence';
import { cx } from './primitives';

function sealDate(ageSeconds: number | null, now: number): Date | null {
  return ageSeconds === null ? null : new Date(now - ageSeconds * 1000);
}

/**
 * The creator card. Every compliance and trust surface the design brief calls
 * for is carried here rather than bolted on elsewhere: the Presence Seal, the
 * verified badge, dollar prices, and an availability state that never
 * over-promises.
 *
 * Note there is no "Talk Now" on an offline card. With part-time supply that
 * button would fail most of the time; the offline card offers an async message
 * instead, which is the load-bearing mechanic when nobody is on.
 */
export function CreatorCard({ creator, now }: { creator: CreatorFixture; now: number }) {
  const live = creator.status === 'live';
  const ring = live ? 'live' : creator.status === 'booking_only' ? 'scheduled' : 'offline';
  const cover = coverFor(creator.id);

  return (
    <article
      className={cx(
        'group relative overflow-hidden rounded-[20px] border bg-surface transition-[border-color,transform,box-shadow] duration-300',
        'hover:-translate-y-0.5',
        live ? 'border-live/25 hover:border-live/50 hover:shadow-[0_18px_50px_-24px_rgba(255,61,129,0.55)]'
             : 'border-hairline hover:border-verified/35 hover:shadow-[0_18px_50px_-28px_rgba(124,92,255,0.4)]',
      )}
    >
      {/* Her newest post is the card. An avatar and a price gave nobody a
          reason to tap; a picture and a caption do. */}
      {cover && (
        <Link href={`/${creator.slug}`} className="relative block overflow-hidden" aria-label={`${creator.displayName}'s profile`}>
          <CoverArt
            seed={cover.seed}
            hue={hueForSeed(creator.slug)}
            rounded={false}
            className="h-44 w-full transition-transform duration-500 group-hover:scale-[1.03]"
            alt={cover.caption ?? `Recent post by ${creator.displayName}`}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
          {cover.caption && (
            <p className="absolute inset-x-0 bottom-0 line-clamp-1 px-4 pb-2.5 text-[12.5px] text-ink-2">
              {cover.caption}
            </p>
          )}
          <span className="absolute right-3 top-3 rounded-full bg-ground/70 px-2 py-1 text-[10.5px] text-ink-2 backdrop-blur">
            {timeAgo(cover.createdAt, new Date(now))}
          </span>
        </Link>
      )}

      <div className="relative p-5">
        <div className="flex items-start gap-3.5">
          <Link href={`/${creator.slug}`} className="press shrink-0" aria-label={`${creator.displayName}'s profile`}>
            <AvatarMark name={creator.displayName} hue={creator.hue} size={cover ? 44 : 56} ring={ring} />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link href={`/${creator.slug}`} className="font-display text-[17px] font-semibold tracking-tight hover:text-live-soft">
                {creator.displayName}
              </Link>
              {creator.foundingCreator && (
                <span className="rounded-full border border-warn/30 bg-warn/10 px-1.5 py-0.5 text-[10px] font-semibold text-warn">
                  Founding
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[13.5px] text-ink-2">{creator.tagline}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <StatusPill status={creator.status} nextSlot={creator.nextSlot} queueLength={creator.queueLength} />
              <PresenceSeal lastPassAt={sealDate(creator.sealAgeSeconds, now)} size="sm" now={new Date(now)} />
            </div>
          </div>
        </div>

        {/* Her usual nights — turns part-time from a defect into an appointment. */}
        <div className="mt-4 flex items-center gap-1.5">
          <span className="mr-1 text-[10.5px] uppercase tracking-[0.08em] text-ink-3">Usually</span>
          {creator.usualNights.map((on, i) => (
            <span
              key={i}
              title={on ? 'Usually on this night' : 'Usually off'}
              className={cx(
                'grid h-[22px] w-[22px] place-items-center rounded-md text-[10.5px] font-semibold transition-colors',
                on ? 'bg-verified-dim text-verified-soft' : 'bg-raised text-ink-3/60',
              )}
            >
              {DAY_LABELS[i]}
            </span>
          ))}
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-hairline pt-4">
          <div className="text-[12.5px] leading-snug text-ink-2">
            <span className="font-medium text-ink tabular-nums">{formatUsdCompact(creator.voicePerMinuteMinor)}</span>
            <span className="text-ink-3">/min voice</span>
            <span className="mx-1.5 text-ink-3">·</span>
            <span className="font-medium text-ink tabular-nums">{formatUsdCompact(creator.textPerMessageMinor)}</span>
            <span className="text-ink-3">/msg</span>
          </div>
        </div>

        <div className="mt-3.5 flex gap-2">
          {live ? (
            <>
              <Link href={`/${creator.slug}/start?m=voice`}
                    className="press inline-flex h-10 flex-1 items-center justify-center rounded-full bg-live text-[13.5px] font-semibold text-white shadow-[0_8px_24px_-10px_rgba(255,61,129,0.8)]">
                Talk now
              </Link>
              <Link href={`/${creator.slug}/start?m=text`}
                    className="press inline-flex h-10 items-center justify-center rounded-full border border-hairline px-4 text-[13.5px] font-medium hover:border-ink-3">
                Text
              </Link>
            </>
          ) : creator.status === 'in_session' ? (
            <>
              <Link href={`/${creator.slug}/queue`}
                    className="press inline-flex h-10 flex-1 items-center justify-center rounded-full bg-raised-2 text-[13.5px] font-semibold hover:bg-[#221D33]">
                Join queue{creator.queueLength ? ` · you'd be #${creator.queueLength + 1}` : ''}
              </Link>
              <Link href={`/${creator.slug}/message`}
                    className="press inline-flex h-10 items-center justify-center rounded-full border border-hairline px-4 text-[13.5px] font-medium hover:border-ink-3">
                Message
              </Link>
            </>
          ) : (
            <>
              <Link href={`/${creator.slug}/message`}
                    className="press inline-flex h-10 flex-1 items-center justify-center rounded-full bg-raised-2 text-[13.5px] font-semibold hover:bg-[#221D33]">
                Leave a message · {formatUsd(creator.asyncMessageMinor)}
              </Link>
              <Link href={`/${creator.slug}/book`}
                    className="press inline-flex h-10 items-center justify-center rounded-full border border-hairline px-4 text-[13.5px] font-medium hover:border-ink-3">
                Book
              </Link>
            </>
          )}
        </div>

        {!live && creator.status !== 'in_session' && (
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-3">
            She replies within 24 hours or you are refunded automatically.
          </p>
        )}
      </div>
    </article>
  );
}
