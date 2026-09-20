import Link from 'next/link';
import { CREATORS, DEMO_BUYER } from '@/lib/fixtures';
import { CreatorCard } from '@/components/creator-card';
import { Card, LinkButton, Note, SectionHeading } from '@/components/primitives';

export const metadata = { title: 'Your favourites', robots: { index: false, follow: false } };

export default function FavoritesPage() {
  const now = Date.now();
  const favorites = CREATORS.filter((c) => DEMO_BUYER.favoriteSlugs.includes(c.slug));
  const liveNow = favorites.filter((c) => c.status === 'live');

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-[30px] font-bold tracking-tight">Your favourites</h1>
      <p className="mt-2 text-[14.5px] text-ink-2">
        {liveNow.length > 0
          ? `${liveNow.length} of them ${liveNow.length === 1 ? 'is' : 'are'} on right now.`
          : 'Nobody is on right now — we will email you the moment one of them is.'}
      </p>

      {favorites.length === 0 ? (
        <Card className="mt-8 p-8 text-center">
          <p className="text-[15px] text-ink-2">You have not favourited anyone yet.</p>
          <LinkButton href="/" variant="live" className="mt-5">Browse creators</LinkButton>
        </Card>
      ) : (
        <ul className="stagger mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((c) => (
            <li key={c.id}><CreatorCard creator={c} now={now} /></li>
          ))}
        </ul>
      )}

      <section className="mt-10">
        <SectionHeading>Alerts</SectionHeading>
        <Card className="p-5">
          <div className="space-y-3">
            {favorites.map((c) => (
              <label key={c.id} className="flex items-center gap-3 text-[14px]">
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-[var(--color-live)]" />
                Email me when <span className="font-medium">{c.displayName}</span> goes live
              </label>
            ))}
          </div>
          <Note>
            Two-stage: an hour before a night she usually works, and again the moment she is actually on.
            Push notifications arrive after launch.
          </Note>
        </Card>
      </section>

      <p className="mt-6 text-[12.5px] text-ink-3">
        Creators cannot see your exact browsing history, and some choose to appear live only to favourites.{' '}
        <Link href="/guarantee" className="underline underline-offset-4 hover:text-ink">How privacy works here</Link>.
      </p>
    </div>
  );
}
