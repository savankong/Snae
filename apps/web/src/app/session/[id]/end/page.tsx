import Link from 'next/link';
import { formatUsd, meterVoice } from '@snae/money';
import { CREATORS, creatorBySlug } from '@/lib/fixtures';
import { AvatarMark, ShieldTick } from '@/components/presence';
import { Card, LinkButton, Note } from '@/components/primitives';
import { RateSession } from '@/components/rate-session';

export const metadata = { title: 'Session ended', robots: { index: false, follow: false } };

/**
 * Post-session (§12.1 step 9). Three jobs, in this order:
 * favourite her, rate the session, then — and only then — discovery.
 *
 * The Friends rail is deliberately absent from this screen. §14 forbids
 * cross-creator recommendations during or within 30 minutes after a session
 * with the Home Creator, and this is exactly the "poaching moment" §8 calls
 * out. Discovery waits.
 */
export default async function SessionEnd({ searchParams }: { searchParams: Promise<{ c?: string; s?: string; msgs?: string }> }) {
  const { c, s, msgs } = await searchParams;
  const creator = (c ? creatorBySlug(c) : undefined) ?? CREATORS[0]!;

  const seconds = Number(s ?? 0);
  const messageCount = Number(msgs ?? 0);
  const isVoice = !msgs;

  const billed = isVoice
    ? meterVoice({
        offer: { modality: 'voice', perMinuteMinor: creator.voicePerMinuteMinor, minSeconds: 120 },
        billingStartedAt: new Date(Date.now() - seconds * 1000),
        endedAt: new Date(),
      })
    : { billableSeconds: 0, grossMinor: messageCount * creator.textPerMessageMinor };

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <div className="animate-rise text-center">
        <AvatarMark name={creator.displayName} hue={creator.hue} size={88} ring="offline" />
        <h1 className="mt-5 font-display text-[24px] font-bold tracking-tight">
          That&rsquo;s a wrap with {creator.displayName}
        </h1>
        <p className="mt-2 text-[14.5px] text-ink-2">
          {isVoice
            ? `${Math.ceil(billed.billableSeconds / 60)} minutes, billed at ${formatUsd(creator.voicePerMinuteMinor)}/min.`
            : `${messageCount} message${messageCount === 1 ? '' : 's'}, billed at ${formatUsd(creator.textPerMessageMinor)} each.`}
        </p>
      </div>

      <Card className="mt-7 p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] text-ink-2">Charged to your wallet</span>
          <span className="font-display text-[26px] font-semibold tabular-nums tracking-tight">{formatUsd(billed.grossMinor)}</span>
        </div>
        <div className="mt-4 flex items-center gap-2 border-t border-hairline pt-4">
          <ShieldTick className="h-4 w-4 shrink-0 text-money" />
          <span className="text-[12.5px] text-ink-2">Presence verified for the whole session. No claim filed.</span>
        </div>
      </Card>

      <RateSession creatorName={creator.displayName} />

      <div className="mt-6 space-y-2.5">
        <LinkButton href={`/${creator.slug}`} variant="ghost" size="lg" full>
          Favourite {creator.displayName}
        </LinkButton>
        <LinkButton href="/wallet" variant="outline" size="lg" full>See your wallet</LinkButton>
      </div>

      <div className="mt-6 text-center">
        <Note>
          Something wrong with this session? You have 24 hours to{' '}
          <Link href="/guarantee" className="text-ink-2 underline underline-offset-4">file a guarantee claim</Link>.
        </Note>
      </div>
    </div>
  );
}
