import Link from 'next/link';
import { formatUsd } from '@snae/money';
import { TIER_LABEL, TIER_ORDER, BADGE_LABEL, type Badge } from '@snae/standing';
import { CREATOR_EARNINGS } from '@/lib/fixtures';
import { Button, Card, Note, SectionHeading, cx } from '@/components/primitives';
import { ShieldTick } from '@/components/presence';

export const metadata = { title: 'Who you take', robots: { index: false, follow: false } };

/**
 * Creator accept filters, region blocking, and the regulars CRM
 * (FR-016, FR-024, FR-025, §3.4).
 *
 * Note what a creator sees about a buyer here: a tier and badges, nothing more.
 * No spend, no ratings from other creators, no identities. That narrowing
 * happens in the domain layer's creatorView(), and this page is built to match
 * it rather than to work around it.
 */
export default function BuyersPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/creator/studio" className="text-[13px] text-ink-3 hover:text-ink">← Studio</Link>
      <h1 className="mt-3 font-display text-[30px] font-bold tracking-tight">Who you take</h1>
      <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-2">
        You decide who can start a session with you. All of this is enforced on our side — a buyer who does
        not qualify never reaches you.
      </p>

      <section className="mt-7">
        <SectionHeading>Minimum buyer standing</SectionHeading>
        <Card className="p-5">
          <div className="grid grid-cols-4 gap-2">
            {TIER_ORDER.map((t, i) => (
              <button key={t} aria-pressed={i === 2}
                      className={cx(
                        'press rounded-xl border py-3 text-[13px] font-medium transition-colors',
                        i === 2 ? 'border-verified/50 bg-verified-dim text-verified-soft' : 'border-hairline hover:border-ink-3',
                      )}>
                {TIER_LABEL[t]}
                {i === 0 && <span className="mt-0.5 block text-[10.5px] text-ink-3">and up</span>}
              </button>
            ))}
          </div>
          <Note>
            Standing is computed from payment history, disputes, reports and tick-box ratings. You see the
            tier and badges — never what anyone spends, and never another creator&rsquo;s notes.
          </Note>
        </Card>
      </section>

      <section className="mt-8">
        <SectionHeading>Extra guards</SectionHeading>
        <Card className="divide-y divide-[var(--color-hairline)]">
          <ToggleRow title="Higher minimum for new buyers" defaultOn
                     sub={`New accounts need at least ${formatUsd(2500)} in their wallet before they can start.`} />
          <ToggleRow title="Auto-decline recent disputes" defaultOn
                     sub="Anyone who filed a payment dispute in the last 90 days cannot reach you." />
          <ToggleRow title="Favourites only when live"
                     sub="Only buyers who favourited you see that you are on. Useful if you are being bothered." />
          <ToggleRow title="Hide your online history"
                     sub="Buyers cannot see when you were last on, only whether you are on now." />
        </Card>
      </section>

      <section className="mt-8">
        <SectionHeading>Region blocking</SectionHeading>
        <Card className="p-5">
          <div className="flex flex-wrap gap-2">
            {['California', 'Texas', 'Portland metro'].map((r) => (
              <span key={r} className="inline-flex items-center gap-2 rounded-full border border-danger/30 bg-danger/5 px-3 py-1.5 text-[13px] text-danger">
                {r}
                <button className="press text-danger/60 hover:text-danger" aria-label={`Unblock ${r}`}>×</button>
              </span>
            ))}
            <Button variant="outline" size="sm">Add a region</Button>
          </div>
          <Note>
            Block by state, metro area, or a radius around a location. We use billing and network signals, so
            it is not perfect — but it catches the case most creators worry about.
          </Note>
        </Card>
      </section>

      <section className="mt-8 mb-4">
        <SectionHeading>Your regulars</SectionHeading>
        <Card className="divide-y divide-[var(--color-hairline)]">
          {CREATOR_EARNINGS.regulars.map((r) => (
            <div key={r.name} className="flex items-center gap-3.5 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-raised-2 text-[13px] font-semibold">
                {r.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14.5px] font-medium">{r.name}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-verified-dim px-1.5 py-0.5 text-[10.5px] text-verified-soft">
                    <ShieldTick className="h-2.5 w-2.5" /> {TIER_LABEL[r.tier]}
                  </span>
                </div>
                <div className="text-[12px] text-ink-3">
                  {r.sessions} sessions · last seen {r.lastSeen.toLowerCase()}
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm">Block</Button>
              </div>
            </div>
          ))}
        </Card>
        <Note>
          Badges like {BADGE_LABEL['no_disputes' as Badge].toLowerCase()} come from their record with everyone,
          not just you.
        </Note>
      </section>
    </div>
  );
}

function ToggleRow({ title, sub, defaultOn }: { title: string; sub: string; defaultOn?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3.5 p-4">
      <input type="checkbox" defaultChecked={defaultOn} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-verified)]" />
      <span>
        <span className="block text-[14px] font-medium">{title}</span>
        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-3">{sub}</span>
      </span>
    </label>
  );
}
