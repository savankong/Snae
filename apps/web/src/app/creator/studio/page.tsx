import Link from 'next/link';
import { formatUsd } from '@snae/money';
import { TIER_LABEL } from '@snae/standing';
import { CREATOR_EARNINGS } from '@/lib/fixtures';
import { AvailabilityToggle } from '@/components/availability-toggle';
import { Card, Note, SectionHeading, Stat, cx } from '@/components/primitives';
import { ShieldTick } from '@/components/presence';

export const metadata = { title: 'Studio', robots: { index: false, follow: false } };

/**
 * Creator studio home. Leads with going live, because that is the action she
 * opens this page to take — earnings are one tap away but do not compete with
 * it. §6.2: she wants to control availability, pricing, capacity, and who she
 * talks to, and to see earnings per available hour.
 */
export default function StudioPage() {
  const e = CREATOR_EARNINGS;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-display text-[30px] font-bold tracking-tight">Studio</h1>
        <Link href="/creator/studio/safety" className="press rounded-full border border-hairline px-3.5 py-1.5 text-[13px] text-ink-2 hover:border-danger/40 hover:text-danger">
          Safety
        </Link>
      </div>

      <div className="mt-6"><AvailabilityToggle /></div>

      {/* ── Money ─────────────────────────────────────────────────── */}
      <section className="mt-9">
        <SectionHeading action={
          <Link href="/creator/studio/earnings" className="text-[13px] text-ink-3 underline-offset-4 hover:text-ink hover:underline">
            Full breakdown
          </Link>
        }>
          Your money
        </SectionHeading>
        <Card className="p-5">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <Stat label="Cleared" value={formatUsd(e.clearedMinor)} tone="money" sub={`Paid out ${e.nextPayout.toLowerCase()}`} />
            <Stat label="Pending" value={formatUsd(e.pendingMinor)} tone="muted" sub="Clears in 7 days" />
            <Stat label="Reserve" value={formatUsd(e.reserveMinor)} tone="muted" sub="Shrinks as you build a record" />
            <Stat label="Lifetime" value={formatUsd(e.lifetimeMinor)} />
          </div>
          <Note>
            Weekly payouts today. Once you clear our trust threshold you move to next-day on cleared earnings.
          </Note>
        </Card>
      </section>

      {/* ── Earnings per available hour — §6.2's key creator metric ─ */}
      <section className="mt-8">
        <SectionHeading>This week</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-5">
            <Stat label="Per available hour" value={formatUsd(e.earningsPerAvailableHourMinor)} tone="money" />
            <Note>What an hour of being live actually earned you.</Note>
          </Card>
          <Card className="p-5">
            <Stat label="Hours live" value={`${e.availableHoursThisWeek}`} />
            <Note>Counts toward your ownership pool.</Note>
          </Card>
          <Card className="p-5">
            <Stat label="Sessions" value={`${e.sessionsThisWeek}`} />
            <Note>All presence-verified.</Note>
          </Card>
        </div>
      </section>

      {/* ── Presence record ───────────────────────────────────────── */}
      <section className="mt-8">
        <SectionHeading>Your presence record</SectionHeading>
        <Card className="flex flex-wrap items-center gap-x-6 gap-y-4 p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-money-dim text-money">
              <ShieldTick className="h-6 w-6" />
            </span>
            <div>
              <div className="font-display text-[21px] font-semibold tracking-tight text-money">100%</div>
              <div className="text-[12px] text-ink-3">Sessions verified</div>
            </div>
          </div>
          <div className="h-10 w-px bg-hairline" />
          <div>
            <div className="font-display text-[21px] font-semibold tracking-tight">0</div>
            <div className="text-[12px] text-ink-3">Claims against you</div>
          </div>
          <div className="h-10 w-px bg-hairline" />
          <div>
            <div className="font-display text-[21px] font-semibold tracking-tight">45s</div>
            <div className="text-[12px] text-ink-3">Median reply</div>
          </div>
          <p className="w-full text-[12.5px] text-ink-3">
            Buyers see this on your profile. It is the reason they pay your rate rather than someone else&rsquo;s.
          </p>
        </Card>
      </section>

      {/* ── Recent sessions ───────────────────────────────────────── */}
      <section className="mt-8">
        <SectionHeading action={
          <Link href="/creator/studio/buyers" className="text-[13px] text-ink-3 underline-offset-4 hover:text-ink hover:underline">
            Your regulars
          </Link>
        }>
          Recent sessions
        </SectionHeading>
        <Card className="divide-y divide-[var(--color-hairline)]">
          {e.recentSessions.map((s) => (
            <div key={s.id} className="flex items-center gap-3.5 p-4">
              <span className={cx(
                'grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-semibold',
                s.tier === 'top' ? 'bg-verified-dim text-verified-soft' : 'bg-raised-2 text-ink-2',
              )}>
                {s.buyer.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px]">{s.buyer}</span>
                  <span className="rounded-full bg-raised px-1.5 py-0.5 text-[10.5px] text-ink-3">{TIER_LABEL[s.tier]}</span>
                  {s.verified && <ShieldTick className="h-3.5 w-3.5 text-money" />}
                </div>
                <div className="text-[12px] text-ink-3">{s.modality} · {s.duration} · {s.at}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-[15px] font-semibold tabular-nums text-money">
                  {formatUsd(s.yourShareMinor)}
                </div>
                <div className="text-[11px] text-ink-3">of {formatUsd(s.grossMinor)}</div>
              </div>
            </div>
          ))}
        </Card>
      </section>

      {/* ── Quick links ───────────────────────────────────────────── */}
      <section className="mt-8 mb-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <StudioLink href="/creator/studio/friends" title="Your Friends list"
                      sub="Up to 5 creators you recommend. You earn 5% of what your buyers spend with them." />
          <StudioLink href="/creator/studio/buyers" title="Who you take"
                      sub="Buyer tier filters, minimums for new buyers, and region blocking." />
        </div>
      </section>
    </div>
  );
}

function StudioLink({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link href={href} className="press rounded-[20px] border border-hairline bg-surface p-5 transition-colors hover:border-verified/35">
      <div className="font-display text-[16px] font-semibold tracking-tight">{title}</div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{sub}</p>
    </Link>
  );
}
