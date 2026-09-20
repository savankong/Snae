import Link from 'next/link';
import { isPrimeTime, nextPrimeTimeOpening, rankCreators } from '@snae/marketplace';
import { CREATORS, DEMO_BUYER } from '@/lib/fixtures';
import { activeMoments } from '@/lib/media-fixtures';
import { CreatorCard } from '@/components/creator-card';
import { MomentsRail } from '@/components/moments-rail';
import { ShieldTick } from '@/components/presence';
import { LinkButton, Note } from '@/components/primitives';

export const metadata = {
  description:
    'Browse verified creators available for paid voice and text conversations. Every session is proven live by the creator herself, or your money back.',
};

/**
 * The homepage.
 *
 * The design premise from design/v2 governs: an always-on "62 LIVE" counter
 * over a dense grid would over-promise against 10–25 part-time creators and
 * look dead every time nobody is on. So the page leads with the guarantee —
 * which is always true — and treats availability as a state on each card.
 */
export default function HomePage() {
  const now = Date.now();
  const nowDate = new Date(now);
  const open = isPrimeTime(nowDate);
  const nextOpen = nextPrimeTimeOpening(nowDate);

  const ranked = rankCreators(
    CREATORS.map((c) => ({
      creatorId: c.id,
      status: c.status,
      sealAgeSeconds: c.sealAgeSeconds,
      sessionsVerifiedPct: c.sessionsVerifiedPct,
      medianResponseSeconds: c.medianResponseSeconds,
      isFavorite: DEMO_BUYER.favoriteSlugs.includes(c.slug),
      isFriendOfHome: false,
      lastActiveAt: c.sealAgeSeconds === null ? null : new Date(now - c.sealAgeSeconds * 1000),
    })),
    nowDate,
  );
  const ordered = ranked
    .map((r) => CREATORS.find((c) => c.id === r.creatorId)!)
    .filter(Boolean);

  const liveCount = CREATORS.filter((c) => c.status === 'live').length;
  const moments = activeMoments(nowDate);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* ── Hero: the guarantee, not a live counter ───────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-10 sm:pt-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 h-[380px] w-[680px] -translate-x-1/2 rounded-full opacity-[0.16] blur-[110px]"
          style={{ background: 'radial-gradient(circle, var(--color-live), var(--color-verified) 65%, transparent)' }}
        />
        <div className="relative animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-verified/30 bg-verified-dim px-3 py-1.5 text-[12px] font-medium text-verified-soft">
            <ShieldTick className="h-3.5 w-3.5" />
            The Real-Person Guarantee
          </span>

          <h1 className="mt-5 max-w-3xl font-display text-[40px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[56px]">
            Real people.<br />
            <span className="text-live">Proven live.</span> Available now.
          </h1>

          <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-ink-2">
            Every paid conversation here is with the verified creator herself — proven live at the start of
            the session and throughout it. If it isn&rsquo;t her, you get your money back.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <LinkButton href="/discover" variant="live" size="lg">
              {liveCount > 0 ? `See what's new · ${liveCount} on now` : "See what's new"}
            </LinkButton>
            <LinkButton href="/guarantee" variant="outline" size="lg">How the guarantee works</LinkButton>
          </div>

          <p className="mt-5 text-[12.5px] text-ink-3">
            No account needed to browse. 18+. Prices in dollars — never credits.
          </p>
        </div>
      </section>

      {/* ── Prime Time status ──────────────────────────────────────────── */}
      <section className="mb-10">
        <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border px-4 py-3.5 ${
          open ? 'border-live/25 bg-live-dim/40' : 'border-hairline bg-surface'
        }`}>
          <span className={`h-2 w-2 shrink-0 rounded-full ${open ? 'bg-live animate-pulse' : 'bg-offline'}`} />
          <span className="text-[13.5px] font-medium">
            {open ? 'Prime Time is open' : 'Prime Time is closed'}
          </span>
          <span className="text-[13px] text-ink-2">
            {open
              ? 'Most creators are on between 7pm and 1am Eastern.'
              : nextOpen
                ? `Opens again ${nextOpen.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', timeZone: 'America/New_York' })} Eastern.`
                : 'Check back this evening.'}
          </span>
          <Link href="/guarantee#prime-time" className="ml-auto text-[13px] text-ink-3 underline-offset-4 hover:text-ink hover:underline">
            Why windows?
          </Link>
        </div>
      </section>

      {/* ── Moments ───────────────────────────────────────────────────── */}
      {moments.length > 0 && (
        <section className="mb-10">
          <MomentsRail moments={moments} now={nowDate} />
        </section>
      )}

      {/* ── Cards ──────────────────────────────────────────────────────── */}
      <section id="browse" className="scroll-mt-20">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-[19px] font-semibold tracking-tight">Creators</h2>
          <Link href="/discover" className="text-[13px] text-ink-3 underline-offset-4 hover:text-ink hover:underline">
            See everything posted today
          </Link>
        </div>

        <ul className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((c) => (
            <li key={c.id}>
              <CreatorCard creator={c} now={now} />
            </li>
          ))}
        </ul>
      </section>

      {/* ── The guarantee, explained ───────────────────────────────────── */}
      <section className="mt-20">
        <h2 className="font-display text-[26px] font-bold tracking-tight sm:text-[32px]">
          No chatters. No bots. Guaranteed.
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Other platforms verify a creator&rsquo;s identity once, at signup, and then say nothing about who is
          typing. We verify her presence every single session.
        </p>

        <ul className="stagger mt-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: 'She says your name',
              body: 'Before billing starts, she records a live 3–5 second greeting that says your display name. It cannot be pre-recorded, because it is about you.',
            },
            {
              title: 'Checked against her ID',
              body: 'That greeting is matched for liveness against the government ID she verified with. The platform confirms it is the same person.',
            },
            {
              title: 'Or you are refunded',
              body: 'A "Not her?" button sits in every session. Failed checks refund to your wallet automatically — no argument, no support queue.',
            },
          ].map((step, i) => (
            <li key={step.title} className="rounded-[20px] border border-hairline bg-surface p-5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-verified-dim font-display text-[13px] font-bold text-verified-soft">
                {i + 1}
              </span>
              <h3 className="mt-3.5 font-display text-[16px] font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{step.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Creator recruitment ────────────────────────────────────────── */}
      <section className="mt-16 overflow-hidden rounded-[24px] border border-hairline bg-gradient-to-br from-verified-dim/60 to-surface p-7 sm:p-10">
        <h2 className="max-w-lg font-display text-[24px] font-bold tracking-tight sm:text-[28px]">
          You do your own talking. Get paid like it.
        </h2>
        <p className="mt-3 max-w-lg text-[14.5px] leading-relaxed text-ink-2">
          Snae is built for creators who answer their own messages and are tired of competing with agency-run
          accounts. Keep up to 85%, get paid weekly, and work behind real protection.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <LinkButton href="/creator/onboarding" variant="verified">Apply to create</LinkButton>
          <LinkButton href="/creator" variant="outline">What creators get</LinkButton>
        </div>
      </section>
    </div>
  );
}
