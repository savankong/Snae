import { formatUsd } from '@snae/money';
import { DEMO_BUYER, WALLET_HISTORY } from '@/lib/fixtures';
import { TopUp } from '@/components/topup';
import { Card, Note, SectionHeading, cx } from '@/components/primitives';
import { ShieldTick } from '@/components/presence';

export const metadata = { title: 'Your wallet', robots: { index: false, follow: false } };

export default function WalletPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-[30px] font-bold tracking-tight">Your wallet</h1>

      <Card className="animate-rise mt-6 overflow-hidden">
        <div className="bg-gradient-to-br from-money-dim/70 to-surface p-6">
          <div className="text-[11.5px] uppercase tracking-[0.09em] text-ink-3">Balance</div>
          <div className="mt-1.5 font-display text-[44px] font-bold leading-none tabular-nums tracking-tight text-money">
            {formatUsd(DEMO_BUYER.walletBalanceMinor)}
          </div>
          <p className="mt-3 text-[13px] text-ink-2">
            Dollars, not credits. What you see is what a session costs.
          </p>
        </div>
      </Card>

      <section className="mt-8">
        <SectionHeading>Top up</SectionHeading>
        <Card className="p-5">
          <TopUp balanceMinor={DEMO_BUYER.walletBalanceMinor} />
        </Card>
      </section>

      <section className="mt-9">
        <SectionHeading>Statement</SectionHeading>
        <Card className="divide-y divide-[var(--color-hairline)]">
          {WALLET_HISTORY.map((row) => (
            <div key={row.id} className="flex items-center gap-3.5 p-4">
              <span className={cx(
                'grid h-9 w-9 shrink-0 place-items-center rounded-full',
                row.kind === 'credit' && 'bg-money-dim text-money',
                row.kind === 'debit' && 'bg-raised-2 text-ink-2',
                row.kind === 'refund' && 'bg-verified-dim text-verified-soft',
              )}>
                {row.kind === 'refund' ? <ShieldTick className="h-4 w-4" /> : row.kind === 'credit' ? <PlusIcon /> : <ArrowIcon />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px]">{row.label}</div>
                <div className="truncate text-[12px] text-ink-3">{row.sublabel} · {row.at}</div>
              </div>
              <div className={cx(
                'shrink-0 font-display text-[15px] font-semibold tabular-nums',
                row.amountMinor > 0 ? 'text-money' : 'text-ink',
              )}>
                {row.amountMinor > 0 ? '+' : ''}{formatUsd(row.amountMinor)}
              </div>
            </div>
          ))}
        </Card>
        <Note>
          Every line is an immutable ledger entry. Refunds and corrections appear as their own entries rather
          than editing history.
        </Note>
      </section>
    </div>
  );
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>;
}
function ArrowIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M7 17 17 7M17 7H9m8 0v8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
