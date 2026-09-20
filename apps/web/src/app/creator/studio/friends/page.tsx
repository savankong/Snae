import Link from 'next/link';
import { REFERRAL } from '@snae/config';
import { CREATORS } from '@/lib/fixtures';
import { AvatarMark } from '@/components/presence';
import { Button, Card, Note, SectionHeading } from '@/components/primitives';

export const metadata = { title: 'Friends list', robots: { index: false, follow: false } };

/**
 * The Friends list (FR-014, §8).
 *
 * This page exists to fix the v1.0 mistake where the platform showed a
 * creator's own fans other creators right after they paid — which "reads as
 * poaching". Here she picks who her buyers see, and she earns from it. The
 * commission comes out of the platform's share, not another creator's.
 */
export default function FriendsPage() {
  const picked = CREATORS.slice(1, 3);
  const available = CREATORS.slice(3);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/creator/studio" className="text-[13px] text-ink-3 hover:text-ink">← Studio</Link>
      <h1 className="mt-3 font-display text-[30px] font-bold tracking-tight">Your Friends list</h1>
      <p className="mt-2.5 max-w-lg text-[14.5px] leading-relaxed text-ink-2">
        When you are offline or at capacity, your buyers see the creators you picked — nobody else&rsquo;s
        choice, and never during or straight after a session with you.
      </p>

      <Card className="mt-6 p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-medium text-ink-2">You earn</span>
          <span className="font-display text-[26px] font-semibold tabular-nums text-money">
            {REFERRAL.commissionRate * 100}%
          </span>
        </div>
        <Note>
          Of everything your buyers spend with these creators, for {REFERRAL.windowDays} days, uncapped. Paid
          from our share — it never comes out of what they earn.
        </Note>
      </Card>

      <section className="mt-8">
        <SectionHeading action={<span className="text-[13px] text-ink-3">{picked.length} of {REFERRAL.maxFriends}</span>}>
          Who you recommend
        </SectionHeading>
        <Card className="divide-y divide-[var(--color-hairline)]">
          {picked.map((c) => (
            <div key={c.id} className="flex items-center gap-3.5 p-4">
              <AvatarMark name={c.displayName} hue={c.hue} size={44} ring={c.status === 'live' ? 'live' : 'offline'} />
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-medium">{c.displayName}</div>
                <div className="truncate text-[12.5px] text-ink-3">{c.tagline}</div>
              </div>
              <Button variant="outline" size="sm">Remove</Button>
            </div>
          ))}
        </Card>
      </section>

      <section className="mt-8 mb-4">
        <SectionHeading>Add someone</SectionHeading>
        <Card className="divide-y divide-[var(--color-hairline)]">
          {available.map((c) => (
            <div key={c.id} className="flex items-center gap-3.5 p-4">
              <AvatarMark name={c.displayName} hue={c.hue} size={44} ring="offline" />
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-medium">{c.displayName}</div>
                <div className="truncate text-[12.5px] text-ink-3">{c.tagline}</div>
              </div>
              <Button variant="ghost" size="sm">Add</Button>
            </div>
          ))}
        </Card>
        <Note>
          Pick people you would actually vouch for. Your buyers will read this as your recommendation, because
          it is.
        </Note>
      </section>
    </div>
  );
}
