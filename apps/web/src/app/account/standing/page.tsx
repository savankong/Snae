import { computeStanding, TIER_LABEL, BADGE_LABEL, TIER_ORDER, type Badge } from '@snae/standing';
import { Card, Note, SectionHeading, Button, cx } from '@/components/primitives';
import { ShieldTick } from '@/components/presence';

export const metadata = { title: 'Your standing', robots: { index: false, follow: false } };

/**
 * The buyer's own view of his standing (§14, FR-023).
 *
 * §14 gives buyers the right to see their tier *and the reasons for it*, and to
 * appeal. That is why this page shows the reason strings and an appeal route,
 * while a creator's view of the same buyer is narrowed to tier + badges by
 * `creatorView()` in the domain layer. The asymmetry is the point.
 */
export default function StandingPage() {
  const standing = computeStanding({
    ageVerified: true,
    accountAgeDays: 128,
    completedSessions: 17,
    chargebacks: 0,
    rejectedClaims: 0,
    blocksReceived: 0,
    reportsUpheld: 0,
    ratings: { respectful: 16, paidAsAgreed: 17, followedRules: 17, total: 17 },
    repeatRelationships: 3,
  });

  const currentIndex = TIER_ORDER.indexOf(standing.tier);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-[30px] font-bold tracking-tight">Your standing</h1>
      <p className="mt-2.5 max-w-lg text-[14.5px] leading-relaxed text-ink-2">
        Creators see your tier before they accept a session. Good standing gets you queue priority, lower
        minimums, and access to creators who only take trusted buyers.
      </p>

      <Card className="animate-rise mt-7 overflow-hidden">
        <div className="bg-gradient-to-br from-verified-dim/70 to-surface p-6">
          <div className="text-[11.5px] uppercase tracking-[0.09em] text-ink-3">Current tier</div>
          <div className="mt-1.5 flex items-baseline gap-3">
            <span className="font-display text-[40px] font-bold leading-none tracking-tight text-verified-soft">
              {TIER_LABEL[standing.tier]}
            </span>
          </div>

          {/* Tier ladder */}
          <div className="mt-5 flex gap-1.5">
            {TIER_ORDER.map((t, i) => (
              <div key={t} className="flex-1">
                <div className={cx(
                  'h-1.5 rounded-full transition-colors',
                  i <= currentIndex ? 'bg-verified' : 'bg-raised-2',
                )} />
                <div className={cx('mt-2 text-[11px]', i === currentIndex ? 'font-semibold text-ink' : 'text-ink-3')}>
                  {TIER_LABEL[t]}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-hairline p-5">
          <div className="mb-3 text-[13px] font-medium text-ink-2">Your badges</div>
          <div className="flex flex-wrap gap-2">
            {(standing.badges as Badge[]).map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5 rounded-full border border-money/30 bg-money-dim/50 px-3 py-1.5 text-[12.5px] text-money">
                <ShieldTick className="h-3.5 w-3.5" /> {BADGE_LABEL[b]}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <section className="mt-8">
        <SectionHeading>Why you are here</SectionHeading>
        <Card className="p-5">
          <ul className="space-y-2.5">
            {standing.reasons.map((r) => (
              <li key={r} className="flex items-start gap-2.5 text-[14px] text-ink-2">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-verified" />
                {r}
              </li>
            ))}
          </ul>
          <Note>
            Standing is computed from structured signals only — payment history, disputes, reports, and
            tick-box ratings from creators. Creators never write notes about you, and never see what you spend.
          </Note>
        </Card>
      </section>

      <section className="mt-8">
        <SectionHeading>What this gets you</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ['Queue priority', 'You move ahead of lower-tier buyers when a creator is busy.'],
            ['Lower minimums', 'Creators who set higher wallet minimums for new buyers waive them for you.'],
            ['Wider access', 'Creators who only accept Trusted and above will take your sessions.'],
            ['Faster claims', 'Guarantee claims from trusted buyers are reviewed first.'],
          ].map(([title, body]) => (
            <Card key={title} className="p-4">
              <div className="text-[14px] font-medium">{title}</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-8 mb-4">
        <Card className="flex flex-wrap items-center gap-4 p-5">
          <div className="flex-1">
            <div className="text-[14px] font-medium">Think this is wrong?</div>
            <Note>You can appeal. A person reviews it, and tiers recover over time after good activity.</Note>
          </div>
          <Button variant="outline">Appeal your tier</Button>
        </Card>
      </section>
    </div>
  );
}
