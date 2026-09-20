import { formatUsd } from '@snae/money';
import { Button, Card, Note, SectionHeading, Stat, cx } from '@/components/primitives';

/**
 * Payment disputes and evidence packets (FR-022, §3.1).
 *
 * The packet is assembled automatically and idempotently on the dispute
 * webhook — this page is where a human confirms and submits it, and where the
 * win rate that drives processor negotiation is tracked. Evidence is retained
 * only for the dispute window the card networks allow, then destroyed.
 */
export default function DisputesPage() {
  return (
    <div>
      <h1 className="font-display text-[28px] font-bold tracking-tight">Payment disputes</h1>

      <Card className="mt-6 grid grid-cols-2 gap-5 p-5 sm:grid-cols-4">
        <Stat label="Dispute ratio" value="0.18%" tone="money" sub="Threshold: 0.65%" />
        <Stat label="Representment win" value="81%" tone="money" sub="13 of 16" />
        <Stat label="Open" value="1" />
        <Stat label="At risk" value={formatUsd(8_900)} tone="muted" />
      </Card>

      <section className="mt-8">
        <SectionHeading>Open disputes</SectionHeading>
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="font-display text-[16px] font-semibold tracking-tight">Case 8841-QX</div>
              <div className="mt-0.5 text-[13px] text-ink-3">
                &ldquo;I didn&rsquo;t authorise this&rdquo; · received 4 hours ago · respond by Friday
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-[19px] font-semibold tabular-nums">{formatUsd(8_900)}</div>
              <div className="text-[11.5px] text-ink-3">wallet top-up</div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-hairline bg-raised p-4">
            <div className="mb-3 text-[11.5px] uppercase tracking-[0.08em] text-ink-3">
              Evidence packet — assembled automatically
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {[
                ['Live Hello saying the buyer’s name', true],
                ['Provider liveness and match result', true],
                ['Account and device history, 6 months', true],
                ['Wallet top-up authorisation', true],
                ['Metered session logs', true],
                ['Post-session activity: favourited creator', true],
              ].map(([label, ok]) => (
                <li key={label as string} className="flex items-center gap-2 text-[13px]">
                  <span className={cx('grid h-4 w-4 place-items-center rounded-full text-[9px]', ok ? 'bg-money text-ground' : 'bg-raised-2')}>✓</span>
                  {label as string}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="money" size="sm">Submit representment</Button>
            <Button variant="outline" size="sm">Review packet</Button>
            <Button variant="ghost" size="sm">Accept the chargeback</Button>
          </div>
          <Note>
            This is the moat working: a session with a name-specific Live Hello and a full presence log is very
            hard to dispute as unauthorised. Evidence is destroyed after the dispute window closes.
          </Note>
        </Card>
      </section>
    </div>
  );
}
