import Link from 'next/link';
import {
  rankFeed, applyFilter, isDiscoverable, FILTER_LABEL,
  type FeedFilter, type FeedItem,
} from '@snae/media';
import { CREATORS, creatorById } from '@/lib/fixtures';
import { MEDIA, viewerFor, activeMoments } from '@/lib/media-fixtures';
import { ContentCard, masonryColumns } from '@/components/content-card';
import { MomentsRail } from '@/components/moments-rail';
import { cx } from '@/components/primitives';

export const metadata = {
  title: 'Discover',
  description: 'See what verified creators are posting right now, and talk to the ones who are on.',
  alternates: { canonical: '/discover' },
};

const FILTERS: FeedFilter[] = ['for_you', 'live_now', 'moments', 'new_here'];

/**
 * The discovery feed.
 *
 * Ranked by recency and live availability rather than engagement — see the note
 * in @snae/media for why. There is no like count anywhere on this page, and no
 * paid placement: a popularity term would bury every new creator on her first
 * night, which is the opposite of what thin supply needs.
 */
export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const active: FeedFilter = FILTERS.includes(f as FeedFilter) ? (f as FeedFilter) : 'for_you';
  const now = new Date(Date.UTC(2026, 8, 20, 3, 0, 0));

  const items: FeedItem[] = MEDIA
    .filter((m) => isDiscoverable(m, now))
    .map((media) => {
      const creator = creatorById(media.creatorId)!;
      return {
        media,
        creatorStatus: creator.status,
        creatorIsFavorite: viewerFor(media.creatorId).hasFavorited,
        sealAgeSeconds: creator.sealAgeSeconds,
      };
    });

  const ranked = rankFeed(applyFilter(items, active), now);
  const moments = activeMoments(now);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[30px] font-bold tracking-tight">Discover</h1>
        <p className="mt-1.5 text-[14.5px] text-ink-2">
          What everyone posted today. Tap anyone who&rsquo;s on.
        </p>
      </header>

      {/* Moments rail — ephemeral, so it is always the freshest thing here. */}
      {moments.length > 0 && active !== 'live_now' && (
        <section className="mb-8">
          <MomentsRail moments={moments} now={now} />
        </section>
      )}

      {/* Filter chips */}
      <nav className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Filter content">
        {FILTERS.map((filter) => {
          const on = filter === active;
          return (
            <Link
              key={filter}
              href={filter === 'for_you' ? '/discover' : `/discover?f=${filter}`}
              aria-current={on ? 'page' : undefined}
              className={cx(
                'press shrink-0 rounded-full border px-4 py-2 text-[13.5px] font-medium transition-colors',
                on ? 'border-live/50 bg-live-dim text-live-soft' : 'border-hairline text-ink-2 hover:border-ink-3',
              )}
            >
              {FILTER_LABEL[filter]}
            </Link>
          );
        })}
      </nav>

      {ranked.length === 0 ? (
        <EmptyState filter={active} />
      ) : (
        <>
          {/* Masonry. Columns are built explicitly so rank order reads across. */}
          <div className="grid grid-cols-2 gap-3 lg:hidden">
            {masonryColumns(ranked, 2).map((column, ci) => (
              <div key={ci} className="flex flex-col gap-3">
                {column.map((item) => (
                  <ContentCard
                    key={item.media.id}
                    media={item.media}
                    creator={creatorById(item.media.creatorId)!}
                    viewer={viewerFor(item.media.creatorId)}
                    now={now}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="hidden grid-cols-4 gap-4 lg:grid">
            {masonryColumns(ranked, 4).map((column, ci) => (
              <div key={ci} className="flex flex-col gap-4">
                {column.map((item) => (
                  <ContentCard
                    key={item.media.id}
                    media={item.media}
                    creator={creatorById(item.media.creatorId)!}
                    viewer={viewerFor(item.media.creatorId)}
                    now={now}
                  />
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      <p className="mt-10 text-center text-[12.5px] text-ink-3">
        Ordered by what&rsquo;s recent and who&rsquo;s available — never by likes, and never by payment.
      </p>
    </div>
  );
}

function EmptyState({ filter }: { filter: FeedFilter }) {
  const liveSoon = CREATORS.filter((c) => c.nextSlot).slice(0, 3);
  return (
    <div className="rounded-[20px] border border-hairline bg-surface p-8 text-center">
      <p className="font-display text-[18px] font-semibold tracking-tight">
        {filter === 'live_now' ? 'Nobody is on right now' : 'Nothing here yet'}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-ink-2">
        {filter === 'live_now'
          ? 'Most creators are on between 7pm and 1am Eastern. Here is who is on later.'
          : 'Try another filter, or have a look at who is around tonight.'}
      </p>
      {liveSoon.length > 0 && (
        <ul className="mt-5 flex flex-wrap justify-center gap-2">
          {liveSoon.map((c) => (
            <li key={c.id}>
              <Link href={`/${c.slug}`} className="press inline-flex items-center gap-2 rounded-full border border-hairline px-3 py-1.5 text-[13px] hover:border-verified/40">
                <span className="font-medium">{c.displayName}</span>
                <span className="text-ink-3">{c.nextSlot}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
