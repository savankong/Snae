import Link from 'next/link';
import { formatUsd } from '@snae/money';
import { Card, Note, SectionHeading, Stat, cx } from '@/components/primitives';

/**
 * Admin overview. Built to surface exceptions only (§17: "dashboards that
 * surface only exceptions"), because founder time is the scarcest input at
 * launch and a dashboard full of healthy numbers wastes it.
 */
export default function AdminOverview() {
  return (
    <div>
      <h1 className="font-display text-[28px] font-bold tracking-tight">Overview</h1>

      <section className="mt-6">
        <SectionHeading>Needs you now</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-3">
          <QueueCard href="/admin/claims" label="Guarantee claims" count={2} urgent
                     sub="Presence was clean — needs a human" />
          <QueueCard href="/admin/verification" label="Creator verification" count={4}
                     sub="Awaiting profile review" />
          <QueueCard href="/admin/disputes" label="Payment disputes" count={1} urgent
                     sub="Evidence packet ready to submit" />
        </div>
      </section>

      <section className="mt-8">
        <SectionHeading>Presence health</SectionHeading>
        <Card className="grid grid-cols-2 gap-5 p-5 sm:grid-cols-4">
          <Stat label="Live Hello pass rate" value="98.4%" tone="money" sub="Last 7 days" />
          <Stat label="Re-check pass rate" value="99.1%" tone="money" sub="Last 7 days" />
          <Stat label="Claim rate" value="0.6%" sub="Of all sessions" />
          <Stat label="Claims upheld" value="0.1%" sub="Deterrence is working" />
        </Card>
        <Note>
          A rising claim rate with a flat upheld rate usually means buyer confusion, not delegation. A rising
          upheld rate is the one to escalate.
        </Note>
      </section>

      <section className="mt-8">
        <SectionHeading>Moat health</SectionHeading>
        <Card className="grid grid-cols-2 gap-5 p-5 sm:grid-cols-4">
          <Stat label="Dispute ratio" value="0.18%" tone="money" sub="Category norm ~0.9%" />
          <Stat label="Representment win" value="81%" tone="money" sub="Packets submitted: 16" />
          <Stat label="Effective processing" value="9.4%" sub="Down from 12% assumption" />
          <Stat label="Reserve" value="8%" sub="Renegotiate at 6 months" />
        </Card>
        <Note>
          Every point of processing cost removed by a low dispute ratio funds creator economics. This table is
          the input to the next processor conversation.
        </Note>
      </section>

      <section className="mt-8">
        <SectionHeading>Marketplace</SectionHeading>
        <Card className="grid grid-cols-2 gap-5 p-5 sm:grid-cols-4">
          <Stat label="Gross spend, 7d" value={formatUsd(1_284_000)} />
          <Stat label="Blended take" value="27%" />
          <Stat label="Second-creator rate" value="22%" sub="Via Friends lists" />
          <Stat label="Median time to paid" value="4m 12s" />
        </Card>
      </section>
    </div>
  );
}

function QueueCard({ href, label, count, sub, urgent }: {
  href: string; label: string; count: number; sub: string; urgent?: boolean;
}) {
  return (
    <Link href={href}
          className={cx(
            'press rounded-[20px] border bg-surface p-5 transition-colors',
            urgent && count > 0 ? 'border-warn/35 hover:border-warn/60' : 'border-hairline hover:border-ink-3',
          )}>
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-ink-2">{label}</span>
        <span className={cx('font-display text-[26px] font-bold tabular-nums', urgent && count > 0 ? 'text-warn' : 'text-ink')}>
          {count}
        </span>
      </div>
      <p className="mt-1.5 text-[12.5px] text-ink-3">{sub}</p>
    </Link>
  );
}
