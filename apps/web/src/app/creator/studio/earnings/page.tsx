import Link from 'next/link';
import { formatUsd } from '@snae/money';
import { TAKE_RATES } from '@snae/config';
import { CREATOR_EARNINGS } from '@/lib/fixtures';
import { Card, Note, SectionHeading, Stat, cx } from '@/components/primitives';

export const metadata = { title: 'Earnings', robots: { index: false, follow: false } };

/**
 * Earnings and payouts (FR-016, §3.3).
 *
 * The split is shown openly, including *why* it differs per buyer — a creator
 * who brought her own buyer keeps more. §8 exists because the previous design
 * felt like poaching; showing the arithmetic is part of not repeating that.
 */
export default function EarningsPage() {
  const e = CREATOR_EARNINGS;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/creator/studio" className="text-[13px] text-ink-3 hover:text-ink">← Studio</Link>
      <h1 className="mt-3 font-display text-[30px] font-bold tracking-tight">Earnings</h1>

      <Card className="animate-rise mt-6 overflow-hidden">
        <div className="bg-gradient-to-br from-money-dim/70 to-surface p-6">
          <div className="text-[11.5px] uppercase tracking-[0.09em] text-ink-3">Available for payout</div>
          <div className="mt-1.5 font-display text-[44px] font-bold leading-none tabular-nums tracking-tight text-money">
            {formatUsd(e.clearedMinor)}
          </div>
          <p className="mt-3 text-[13px] text-ink-2">Next payout {e.nextPayout}. {e.payoutSpeed} schedule.</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-[var(--color-hairline)] border-t border-hairline">
          <div className="p-4"><Stat label="Pending" value={formatUsd(e.pendingMinor)} tone="muted" /></div>
          <div className="p-4"><Stat label="Reserve" value={formatUsd(e.reserveMinor)} tone="muted" /></div>
          <div className="p-4"><Stat label="Lifetime" value={formatUsd(e.lifetimeMinor)} /></div>
        </div>
      </Card>

      <section className="mt-8">
        <SectionHeading>How your split works</SectionHeading>
        <Card className="p-5">
          <div className="space-y-4">
            <SplitRow
              label="Buyers you brought"
              sub="Someone who found you through your own link"
              pct={TAKE_RATES.creatorBrought.founding}
              foundingPct={TAKE_RATES.creatorBrought.founding}
              standardPct={TAKE_RATES.creatorBrought.standard}
            />
            <SplitRow
              label="Buyers we brought"
              sub="Someone who found you browsing Snae"
              pct={TAKE_RATES.marketplace.founding}
              foundingPct={TAKE_RATES.marketplace.founding}
              standardPct={TAKE_RATES.marketplace.standard}
            />
          </div>
          <Note>
            You are on Founding Creator rates for your first six months. Share your link and you keep more —
            that is the whole reason the two rates differ.
          </Note>
        </Card>
      </section>

      <section className="mt-8">
        <SectionHeading>Reserve and clawback</SectionHeading>
        <Card className="p-5">
          <p className="text-[14px] leading-relaxed text-ink-2">
            We hold a small reserve against payment disputes. It shrinks as your record grows, and it is
            released to you on schedule. If a guarantee claim is ever upheld against you, the buyer&rsquo;s
            refund is recovered from future earnings rather than clawed back from money already paid.
          </p>
          <Note>
            Your dispute rate is currently zero, which is why your reserve is at the floor.
          </Note>
        </Card>
      </section>

      <section className="mt-8">
        <SectionHeading>Ownership pool</SectionHeading>
        <Card className="p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-ink-2">Qualifying activity this period</span>
            <span className="font-display text-[19px] font-semibold tabular-nums">{e.availableHoursThisWeek} hrs</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raised-2">
            <div className="h-full rounded-full bg-verified transition-[width] duration-700" style={{ width: '58%' }} />
          </div>
          <Note>
            Verified live hours, sessions completed, and buyers you brought all accrue toward the creator
            ownership pool. We are tracking from day one; allocations come later, once the structure is
            finalised with counsel.
          </Note>
        </Card>
      </section>

      <section className="mt-8 mb-4">
        <SectionHeading>Statements</SectionHeading>
        <Card className="divide-y divide-[var(--color-hairline)]">
          {['This week', 'Last week', 'Two weeks ago'].map((p, i) => (
            <div key={p} className="flex items-center justify-between p-4">
              <div>
                <div className="text-[14px]">{p}</div>
                <div className="text-[12px] text-ink-3">{[23, 31, 19][i]} sessions</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-[15px] font-semibold tabular-nums">
                  {formatUsd([48_230, 61_100, 38_400][i]!)}
                </span>
                <button className="press rounded-full border border-hairline px-3 py-1.5 text-[12px] text-ink-2 hover:border-ink-3">
                  Download
                </button>
              </div>
            </div>
          ))}
        </Card>
        <Note>Downloadable statements work for landlords and lenders. Tax set-asides arrive later.</Note>
      </section>
    </div>
  );
}

function SplitRow({ label, sub, pct, foundingPct, standardPct }: {
  label: string; sub: string; pct: number; foundingPct: number; standardPct: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-[14px] font-medium">{label}</div>
          <div className="text-[12.5px] text-ink-3">{sub}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-[21px] font-semibold tabular-nums text-money">{Math.round(pct * 100)}%</div>
          <div className="text-[11px] text-ink-3">{Math.round(standardPct * 100)}% after 6 months</div>
        </div>
      </div>
      <div className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-raised-2">
        <div className={cx('h-full bg-money transition-[width] duration-700')} style={{ width: `${foundingPct * 100}%` }} />
      </div>
    </div>
  );
}
