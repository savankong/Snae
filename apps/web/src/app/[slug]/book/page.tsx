import { notFound } from 'next/navigation';
import { formatUsd } from '@snae/money';
import { creatorBySlug, DAY_LABELS } from '@/lib/fixtures';
import { AvatarMark } from '@/components/presence';
import { Card, LinkButton, Note, SectionHeading, cx } from '@/components/primitives';

export const metadata = { title: 'Book a time', robots: { index: false, follow: false } };

/**
 * Scheduling (§9, FR-012). "When no one suitable is online, the fallback is
 * booking, not a dead end." Sessions are fixed-duration and prepaid at booking.
 */
export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const creator = creatorBySlug(slug);
  if (!creator) notFound();

  const durations = [
    { minutes: 10, priceMinor: creator.voicePerMinuteMinor * 10 },
    { minutes: 20, priceMinor: creator.voicePerMinuteMinor * 20 },
    { minutes: 30, priceMinor: creator.voicePerMinuteMinor * 30 },
  ];
  const slots = ['7:00pm', '7:30pm', '8:00pm', '9:00pm', '9:30pm', '10:00pm'];

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3.5">
        <AvatarMark name={creator.displayName} hue={creator.hue} size={56} ring="scheduled" />
        <div>
          <h1 className="font-display text-[21px] font-bold tracking-tight">Book {creator.displayName}</h1>
          <p className="text-[13.5px] text-ink-2">Prepaid, fixed length, held just for you.</p>
        </div>
      </div>

      <section className="mt-7">
        <SectionHeading>Her usual nights</SectionHeading>
        <div className="flex gap-2">
          {creator.usualNights.map((on, i) => (
            <button key={i} disabled={!on}
                    className={cx(
                      'press flex-1 rounded-xl border py-3 text-center transition-colors disabled:opacity-30',
                      on ? 'border-verified/35 bg-verified-dim hover:border-verified' : 'border-hairline bg-surface',
                    )}>
              <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3">{DAY_LABELS[i]}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <SectionHeading>How long</SectionHeading>
        <div className="grid grid-cols-3 gap-2.5">
          {durations.map((d, i) => (
            <button key={d.minutes}
                    className={cx(
                      'press rounded-2xl border p-4 text-center transition-colors',
                      i === 1 ? 'border-live/50 bg-live-dim' : 'border-hairline bg-surface hover:border-ink-3',
                    )}>
              <div className="font-display text-[19px] font-semibold tracking-tight">{d.minutes}m</div>
              <div className="mt-1 text-[12.5px] tabular-nums text-ink-2">{formatUsd(d.priceMinor)}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <SectionHeading>Pick a slot</SectionHeading>
        <div className="grid grid-cols-3 gap-2.5">
          {slots.map((s, i) => (
            <button key={s} disabled={i === 2}
                    className={cx(
                      'press rounded-xl border py-3 text-[13.5px] transition-colors disabled:opacity-30 disabled:line-through',
                      'border-hairline bg-surface hover:border-verified/40',
                    )}>
              {s}
            </button>
          ))}
        </div>
      </section>

      <Card className="mt-6 p-5">
        <LinkButton href={`/${creator.slug}`} variant="live" size="lg" full>
          Book and prepay · {formatUsd(durations[1]!.priceMinor)}
        </LinkButton>
        <Note>
          Drawn from your wallet at booking. If she misses the slot you are refunded automatically and it shows
          on her presence record. Cancel up to 2 hours before for a full refund.
        </Note>
      </Card>
    </div>
  );
}
