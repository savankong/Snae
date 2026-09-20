import { TAKE_RATES, REFERRAL, CONCURRENCY, PRESENCE, GUARANTEE, FLAGS, PRICE_BOUNDS } from '@snae/config';
import { formatUsd } from '@snae/money';
import { Card, Note, SectionHeading, cx } from '@/components/primitives';

/**
 * Marketplace settings (§A.5).
 *
 * Every number the business runs on is configurable rather than compiled in —
 * §7.2 is explicit that "the take rate must stay configurable", and Sprint 0
 * will replace the processing and presence cost assumptions with quoted rates.
 * This page reads from @snae/config so it can never drift from what the code
 * actually uses.
 */
export default function SettingsPage() {
  return (
    <div>
      <h1 className="font-display text-[28px] font-bold tracking-tight">Marketplace settings</h1>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-2">
        Live values. Changing any of these is an audited action and takes effect on the next session — never
        retroactively on money already allocated.
      </p>

      <section className="mt-7">
        <SectionHeading>Take rates</SectionHeading>
        <Card className="divide-y divide-[var(--color-hairline)]">
          <SettingRow label="Creator-brought buyer" value={`${TAKE_RATES.creatorBrought.standard * 100}% standard · ${TAKE_RATES.creatorBrought.founding * 100}% founding`} />
          <SettingRow label="Marketplace-acquired buyer" value={`${TAKE_RATES.marketplace.standard * 100}% standard · ${TAKE_RATES.marketplace.founding * 100}% founding`} />
          <SettingRow label="Cross-creator commission" value={`${REFERRAL.commissionRate * 100}% for ${REFERRAL.windowDays} days, from platform share`} />
        </Card>
      </section>

      <section className="mt-8">
        <SectionHeading>Price bounds</SectionHeading>
        <Card className="divide-y divide-[var(--color-hairline)]">
          <SettingRow label="Voice per minute" value={`${formatUsd(PRICE_BOUNDS.voicePerMinuteMinor.min)} – ${formatUsd(PRICE_BOUNDS.voicePerMinuteMinor.max)}`} />
          <SettingRow label="Text per message" value={`${formatUsd(PRICE_BOUNDS.textPerMessageMinor.min)} – ${formatUsd(PRICE_BOUNDS.textPerMessageMinor.max)}`} />
          <SettingRow label="Minimum voice session" value={`${PRICE_BOUNDS.minVoiceSessionSeconds / 60} minutes`} />
        </Card>
        <Note>Floors protect the premium positioning. There is no race to the bottom here by design.</Note>
      </section>

      <section className="mt-8">
        <SectionHeading>Presence</SectionHeading>
        <Card className="divide-y divide-[var(--color-hairline)]">
          <SettingRow label="Live Hello length" value={`${PRESENCE.liveHelloMinSeconds}–${PRESENCE.liveHelloMaxSeconds} seconds`} />
          <SettingRow label="Re-check interval" value={`${PRESENCE.recheckBaseIntervalSeconds / 60} min base, ${PRESENCE.recheckMinIntervalSeconds / 60} min under risk`} />
          <SettingRow label="Failures before session ends" value={`${PRESENCE.maxConsecutiveRecheckFailures} consecutive`} />
          <SettingRow label="Seal goes stale after" value={`${PRESENCE.sealStaleAfterSeconds / 60} minutes`} />
          <SettingRow label="Concurrency cap" value={`${CONCURRENCY.voice} voice or ${CONCURRENCY.text} text`} />
        </Card>
      </section>

      <section className="mt-8">
        <SectionHeading>Guarantee</SectionHeading>
        <Card className="divide-y divide-[var(--color-hairline)]">
          <SettingRow label="Claim window" value={`${GUARANTEE.claimWindowHours} hours after session end`} />
          <SettingRow label="Claim limit" value={`${GUARANTEE.maxClaimsPer30Days} per 30 days`} />
        </Card>
      </section>

      <section className="mt-8 mb-4">
        <SectionHeading>Feature flags</SectionHeading>
        <Card className="p-5">
          <div className="grid gap-2.5 sm:grid-cols-3">
            {Object.entries(FLAGS).map(([key, on]) => (
              <div key={key} className={cx(
                'flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-[13px]',
                on ? 'border-money/25 bg-money-dim/30' : 'border-hairline',
              )}>
                <span className={on ? '' : 'text-ink-3'}>{humanize(key)}</span>
                <span className={cx('text-[11.5px] font-semibold', on ? 'text-money' : 'text-ink-3')}>
                  {on ? 'ON' : 'OFF'}
                </span>
              </div>
            ))}
          </div>
          <Note>
            Payments, presence thresholds, voice and ranking are all flagged so they can be turned off without
            a deploy during a provider outage.
          </Note>
        </Card>
      </section>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <span className="text-[14px] text-ink-2">{label}</span>
      <span className="text-[13.5px] font-medium tabular-nums">{value}</span>
    </div>
  );
}

function humanize(key: string): string {
  const spaced = key.replace(/([A-Z])/g, ' $1').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
