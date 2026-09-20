'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatUsd } from '@snae/money';
import { AvatarMark, ShieldTick } from './presence';
import { Card, Note, cx } from './primitives';

/**
 * The paid async message.
 *
 * design/v2/README calls this "the load-bearing mechanic, not a visual
 * flourish": with part-time supply, Talk Now fails on most visits, so async is
 * what keeps the marketplace transacting around the clock. The refund promise
 * is what makes it safe to buy — she replies within 24 hours or the money comes
 * back automatically, with no claim to file.
 */
export function AsyncMessageComposer({ creator, priceMinor, priceLabel, balanceMinor }: {
  creator: { displayName: string; hue: number; slug: string; nextSlot: string | null };
  priceMinor: number;
  priceLabel: string;
  balanceMinor: number;
}) {
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);
  const affordable = balanceMinor >= priceMinor;

  if (sent) {
    return (
      <div className="mx-auto max-w-lg px-4 py-14 text-center sm:px-6">
        <div className="animate-rise">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-money-dim text-money">
            <ShieldTick className="h-8 w-8" />
          </span>
          <h1 className="mt-5 font-display text-[24px] font-bold tracking-tight">Sent to {creator.displayName}</h1>
          <p className="mx-auto mt-3 max-w-sm text-[14.5px] leading-relaxed text-ink-2">
            She has 24 hours to reply. If she does not, {priceLabel} returns to your wallet automatically —
            you will not have to ask.
          </p>
          {creator.nextSlot && (
            <p className="mt-3 text-[13px] text-ink-3">She is usually on {creator.nextSlot}.</p>
          )}
          <div className="mt-7 space-y-2.5">
            <Link href="/" className="press flex h-12 w-full items-center justify-center rounded-full bg-raised-2 text-sm font-semibold">
              Browse others
            </Link>
            <Link href={`/${creator.slug}`} className="press flex h-12 w-full items-center justify-center rounded-full border border-hairline text-sm font-medium">
              Back to her profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3.5">
        <AvatarMark name={creator.displayName} hue={creator.hue} size={56} ring="offline" />
        <div>
          <h1 className="font-display text-[21px] font-bold tracking-tight">Leave {creator.displayName} a message</h1>
          <p className="text-[13.5px] text-ink-2">
            {creator.nextSlot ? `She is usually on ${creator.nextSlot}.` : 'She is offline right now.'}
          </p>
        </div>
      </div>

      <Card className="mt-6 p-5">
        <label htmlFor="async-body" className="text-[13px] font-medium text-ink-2">Your message</label>
        <textarea
          id="async-body"
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1000}
          placeholder="She'll read this herself — nobody else has access to her account."
          className="mt-2.5 w-full resize-none rounded-2xl border border-hairline bg-ground px-4 py-3.5 text-[14.5px] leading-relaxed placeholder:text-ink-3 focus:border-live/40 focus:outline-none"
        />
        <div className="mt-1.5 text-right text-[11.5px] text-ink-3">{body.length}/1000</div>

        <div className="mt-4 rounded-2xl border border-money/25 bg-money-dim/40 p-4">
          <div className="flex items-start gap-2.5">
            <ShieldTick className="mt-0.5 h-4 w-4 shrink-0 text-money" />
            <div>
              <p className="text-[13.5px] font-medium">She replies within 24 hours, or you are refunded.</p>
              <Note>Automatic. No claim to file, and it does not count against your standing.</Note>
            </div>
          </div>
        </div>

        <button
          disabled={!body.trim() || !affordable}
          onClick={() => setSent(true)}
          className={cx(
            'press mt-4 flex h-14 w-full items-center justify-between rounded-full px-6 text-[15px] font-semibold',
            body.trim() && affordable ? 'bg-live text-white' : 'bg-raised-2 text-ink-3',
          )}
        >
          <span>Send message</span>
          <span className="tabular-nums">{priceLabel}</span>
        </button>

        <Note>
          {affordable
            ? `Drawn from your wallet balance of ${formatUsd(balanceMinor)}.`
            : `You need ${formatUsd(priceMinor - balanceMinor)} more in your wallet.`}
        </Note>
      </Card>
    </div>
  );
}
