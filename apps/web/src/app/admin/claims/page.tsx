import { formatUsd } from '@snae/money';
import { triageClaim } from '@snae/presence';
import { Button, Card, Note, SectionHeading, cx } from '@/components/primitives';
import { ShieldTick } from '@/components/presence';

/**
 * Guarantee claims queue (FR-007, FR-018).
 *
 * Only claims the triage function could not resolve reach this page. The ones
 * with a failed or missing check were auto-refunded by the system (§12.3), and
 * showing them here would waste the reviewer's attention on decisions already
 * made. Each row therefore leads with the presence evidence, because §2.5 says
 * claims are resolved from the log rather than from what either party asserts.
 */
export default function ClaimsQueue() {
  const autoRefunded = triageClaim({
    liveHello: null, rechecks: [], filedWithinWindow: true,
    buyerClaimsLast30Days: 0, buyerGuaranteeEligible: true,
  });

  return (
    <div>
      <h1 className="font-display text-[28px] font-bold tracking-tight">Guarantee claims</h1>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-2">
        Claims where every presence check passed. Failed or missing checks are refunded automatically and do
        not appear here.
      </p>

      <section className="mt-7">
        <SectionHeading>Needs review</SectionHeading>
        <div className="space-y-3">
          {OPEN_CLAIMS.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[16px] font-semibold tracking-tight">{c.creator}</span>
                    <span className="text-[13px] text-ink-3">· claimed by {c.buyer}</span>
                  </div>
                  <p className="mt-1 text-[13px] text-ink-2">
                    &ldquo;{c.reason}&rdquo; · filed {c.filedAt}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-display text-[19px] font-semibold tabular-nums">{formatUsd(c.amountMinor)}</div>
                  <div className="text-[11.5px] text-ink-3">at risk</div>
                </div>
              </div>

              {/* Presence evidence — the actual basis for the decision. */}
              <div className="mt-4 rounded-2xl border border-hairline bg-raised p-4">
                <div className="mb-2.5 text-[11.5px] uppercase tracking-[0.08em] text-ink-3">Presence log</div>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  <Evidence label="Live Hello" value={c.liveHello} pass />
                  <Evidence label="Re-checks" value={c.rechecks} pass />
                  <Evidence label="Device" value={c.device} pass={c.deviceOk} />
                </div>
                <Note>
                  Buyer history: {c.buyerClaims} claims in 30 days · {c.buyerTier} standing
                </Note>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="danger" size="sm">Uphold — refund and clawback</Button>
                <Button variant="outline" size="sm">Reject — presence was clean</Button>
                <Button variant="ghost" size="sm">Refund as goodwill, no clawback</Button>
              </div>
              <Note>
                Upholding refunds the buyer in full, recovers the payout from her future earnings, and records
                it against her presence record. Not reversible without a compensating entry.
              </Note>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <SectionHeading>Resolved automatically</SectionHeading>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <ShieldTick className="h-5 w-5 shrink-0 text-money" />
            <div>
              <div className="text-[14px]">7 claims auto-refunded in the last 7 days</div>
              <Note>Most recent rule fired: {autoRefunded.reason}</Note>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

const OPEN_CLAIMS = [
  {
    id: 'gc1', creator: 'June', buyer: 'M.', reason: 'The replies feel scripted or automated',
    filedAt: '2 hours ago', amountMinor: 1800, liveHello: 'Passed · 19:42:11', rechecks: '3 of 3 passed',
    device: 'Same device, 41 sessions', deviceOk: true, buyerClaims: 2, buyerTier: 'New',
  },
  {
    id: 'gc2', creator: 'Rae', buyer: 'T.', reason: 'It sounds like a different person',
    filedAt: '6 hours ago', amountMinor: 4200, liveHello: 'Passed · 21:08:55', rechecks: 'n/a — voice session',
    device: 'New device, first use', deviceOk: false, buyerClaims: 0, buyerTier: 'Good',
  },
];

function Evidence({ label, value, pass }: { label: string; value: string; pass: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-ink-3">{label}</div>
      <div className={cx('mt-0.5 text-[13px]', pass ? 'text-money' : 'text-warn')}>{value}</div>
    </div>
  );
}
