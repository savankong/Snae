import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatUsd } from '@snae/money';
import { TIER_LABEL } from '@snae/standing';
import { creatorBySlug, DEMO_BUYER } from '@/lib/fixtures';
import { AvatarMark, ShieldTick } from '@/components/presence';
import { Card, LinkButton, Note } from '@/components/primitives';

export const metadata = { title: 'Queue', robots: { index: false, follow: false } };

/**
 * The queue (§9, FR-012). Capacity is a feature here, not a failure — §2.4:
 * "she's in a session — join the queue or schedule". Buyer Standing buys
 * priority, which is one of the perks §3.2 promises.
 */
export default async function QueuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const creator = creatorBySlug(slug);
  if (!creator) notFound();

  const position = creator.queueLength + 1;
  const waitMinutes = position * 7;
  const holdMinor = creator.voicePerMinuteMinor * 2;

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <div className="text-center">
        <AvatarMark name={creator.displayName} hue={creator.hue} size={88} ring="live" />
        <h1 className="mt-5 font-display text-[24px] font-bold tracking-tight">
          {creator.displayName} is in a session
        </h1>
        <p className="mt-2.5 text-[14.5px] text-ink-2">
          She takes one call at a time. That is the whole point — but it means waiting.
        </p>
      </div>

      <Card className="animate-rise mt-7 p-6 text-center">
        <div className="text-[11.5px] uppercase tracking-[0.09em] text-ink-3">Your position</div>
        <div className="mt-1.5 font-display text-[52px] font-bold leading-none tabular-nums tracking-tight text-live">
          #{position}
        </div>
        <p className="mt-3 text-[13.5px] text-ink-2">Roughly {waitMinutes} minutes, based on her recent sessions.</p>

        <div className="mt-5 flex items-center justify-center gap-2 rounded-full border border-verified/30 bg-verified-dim px-3 py-1.5 text-[12px] text-verified-soft">
          <ShieldTick className="h-3.5 w-3.5" />
          {TIER_LABEL[DEMO_BUYER.tier]} standing moved you up the queue
        </div>
      </Card>

      <Card className="mt-3 p-5">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-money" />
          <div>
            <p className="text-[13.5px] font-medium">{formatUsd(holdMinor)} held, not charged</p>
            <Note>
              We hold your two-minute minimum so the slot is real. It is released the moment you leave the
              queue, and you are only billed after her Live Hello passes.
            </Note>
          </div>
        </div>
      </Card>

      <div className="mt-6 space-y-2.5">
        <LinkButton href={`/${creator.slug}/message`} variant="ghost" size="lg" full>
          Leave a message instead · {formatUsd(creator.asyncMessageMinor)}
        </LinkButton>
        <LinkButton href={`/${creator.slug}`} variant="outline" size="lg" full>Leave the queue</LinkButton>
      </div>

      <p className="mt-5 text-center text-[12.5px] text-ink-3">
        We will email you the moment it is your turn. Or{' '}
        <Link href="/" className="underline underline-offset-4 hover:text-ink">see who else is on</Link>.
      </p>
    </div>
  );
}
