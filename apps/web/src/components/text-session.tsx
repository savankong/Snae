'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatUsd } from '@snae/money';
import { nextRecheckDelaySeconds } from '@snae/presence';
import { AvatarMark, ShieldTick } from './presence';
import { Note, cx } from './primitives';
import { NotHerSheet } from './not-her';

/**
 * Paid live text session (FR-010) with risk-weighted presence re-checks (FR-005).
 *
 * The re-check is the delicate part. §2.5 calls for checks that are "silent and
 * risk-weighted, not constant", because creator friction is the main cost of
 * the whole mechanism. So the buyer sees a small, calm confirmation when one
 * passes — evidence the guarantee is still running — and never a modal, a
 * spinner, or an interruption to the conversation.
 *
 * Only the buyer's messages are billable; hers are free. That asymmetry is
 * enforced server-side by meterTextPerMessage, and mirrored here only for
 * display.
 */

interface Msg { id: string; from: 'buyer' | 'creator' | 'system'; body: string; at: string; billable: boolean }

const OPENING: Msg[] = [
  { id: 'm1', from: 'system', body: 'Presence verified — this is her.', at: 'now', billable: false },
  { id: 'm2', from: 'creator', body: "hey Alex — made it. how was the drive?", at: '8:31pm', billable: false },
];

export function TextSession({ creator, perMessageMinor, walletBalanceMinor }: {
  creator: { displayName: string; hue: number; slug: string };
  perMessageMinor: number;
  walletBalanceMinor: number;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(OPENING);
  const [draft, setDraft] = useState('');
  const [claimOpen, setClaimOpen] = useState(false);
  const [recheckFlash, setRecheckFlash] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const billableCount = messages.filter((m) => m.billable).length;
  const spentMinor = billableCount * perMessageMinor;
  const remainingMinor = Math.max(0, walletBalanceMinor - spentMinor);
  const messagesLeft = Math.floor(remainingMinor / perMessageMinor);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Risk-weighted re-check cadence. A clean session drifts toward the base
  // interval; risk signals would tighten it toward the floor. Scaled down for
  // the demo so the behaviour is observable.
  useEffect(() => {
    const delaySeconds = nextRecheckDelaySeconds({});
    const t = setInterval(() => {
      setRecheckFlash(true);
      setTimeout(() => setRecheckFlash(false), 2600);
    }, Math.max(8000, (delaySeconds / 30) * 1000));
    return () => clearInterval(t);
  }, []);

  function send() {
    const body = draft.trim();
    if (!body) return;
    const at = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    setMessages((m) => [...m, { id: `b${m.length}`, from: 'buyer', body, at, billable: true }]);
    setDraft('');
    setTimeout(() => {
      setMessages((m) => [...m, {
        id: `c${m.length}`, from: 'creator', at,
        body: "ha — I'd have said the same. tell me the rest.", billable: false,
      }]);
    }, 1400);
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      {/* ── Conversation header, carrying the seal ────────────────── */}
      <div className="sticky top-16 z-30 border-b border-hairline bg-ground/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <AvatarMark name={creator.displayName} hue={creator.hue} size={40} ring="live" />
          <div className="min-w-0 flex-1">
            <div className="font-display text-[15px] font-semibold tracking-tight">{creator.displayName}</div>
            <div className={cx(
              'flex items-center gap-1.5 text-[11.5px] transition-colors duration-500',
              recheckFlash ? 'text-money' : 'text-verified-soft',
            )}>
              <ShieldTick className="h-3 w-3" />
              {recheckFlash ? 'Presence re-checked just now' : 'Presence verified'}
            </div>
          </div>
          <div className="text-right">
            <div key={spentMinor} className="animate-count font-display text-[15px] font-semibold tabular-nums">
              {formatUsd(spentMinor)}
            </div>
            <div className="text-[11px] text-ink-3">{messagesLeft} msgs left</div>
          </div>
        </div>
      </div>

      {/* ── Thread ────────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <ul className="space-y-3">
          {messages.map((m) => (
            <li key={m.id} className={cx('animate-rise flex', m.from === 'buyer' ? 'justify-end' : m.from === 'system' ? 'justify-center' : 'justify-start')}>
              {m.from === 'system' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-verified/30 bg-verified-dim px-3 py-1.5 text-[11.5px] text-verified-soft">
                  <ShieldTick className="h-3 w-3" /> {m.body}
                </span>
              ) : (
                <div className={cx(
                  'max-w-[78%] rounded-[18px] px-4 py-2.5',
                  m.from === 'buyer' ? 'rounded-br-md bg-live text-white' : 'rounded-bl-md bg-raised-2 text-ink',
                )}>
                  <p className="text-[14.5px] leading-relaxed">{m.body}</p>
                  <div className={cx('mt-1 flex items-center gap-1.5 text-[10.5px]', m.from === 'buyer' ? 'text-white/65' : 'text-ink-3')}>
                    {m.at}
                    {m.billable && <span>· {formatUsd(perMessageMinor)}</span>}
                    {m.from === 'creator' && <span>· free</span>}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
        <div ref={endRef} />
      </div>

      {/* ── Composer ──────────────────────────────────────────────── */}
      <div className="sticky bottom-0 border-t border-hairline bg-ground/95 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-3.5">
          <div className="flex items-end gap-2">
            <label htmlFor="composer" className="sr-only">Write a message</label>
            <textarea
              id="composer"
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={`Message ${creator.displayName}…`}
              className="max-h-32 flex-1 resize-none rounded-[20px] border border-hairline bg-surface px-4 py-3 text-[14.5px] placeholder:text-ink-3 focus:border-live/40 focus:outline-none"
            />
            <button onClick={send} disabled={!draft.trim()}
                    className="press grid h-11 w-11 shrink-0 place-items-center rounded-full bg-live text-white disabled:opacity-35"
                    aria-label={`Send — costs ${formatUsd(perMessageMinor)}`}>
              <SendIcon />
            </button>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-3">
            <Note>Your messages cost {formatUsd(perMessageMinor)}. Hers are free.</Note>
            <div className="flex gap-2">
              <button onClick={() => setClaimOpen(true)}
                      className="press rounded-full border border-hairline px-3 py-1.5 text-[12px] text-ink-2 hover:border-danger/40 hover:text-danger">
                Not her?
              </button>
              <button onClick={() => router.push(`/session/demo/end?c=${creator.slug}&msgs=${billableCount}`)}
                      className="press rounded-full border border-hairline px-3 py-1.5 text-[12px] text-ink-2 hover:border-ink-3">
                End
              </button>
            </div>
          </div>
        </div>
      </div>

      <NotHerSheet open={claimOpen} onClose={() => setClaimOpen(false)} creatorName={creator.displayName} spentMinor={spentMinor} />
    </div>
  );
}

function SendIcon() {
  return <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true"><path d="M3.4 20.4 21.6 12 3.4 3.6 3.4 10.2 15.4 12 3.4 13.8Z" /></svg>;
}
