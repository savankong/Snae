'use client';

import { useEffect, useState } from 'react';
import { formatUsd } from '@snae/money';
import { Button, Note, cx } from './primitives';
import { ShieldTick } from './presence';

/**
 * The "Not her?" guarantee claim (FR-007, §12.3).
 *
 * The sheet deliberately does not ask the buyer to argue his case. §2.5: claims
 * are "resolved from presence logs, not buyer assertion alone" — so the form
 * collects a structured reason and then shows what the presence log actually
 * says. If the log is clean the claim still goes to a human, but the buyer is
 * told that up front rather than being left to expect an instant refund.
 */

const REASONS = [
  { id: 'different_person', label: 'It sounds like a different person' },
  { id: 'scripted', label: 'The replies feel scripted or automated' },
  { id: 'no_hello', label: 'I never got a Live Hello' },
  { id: 'name_wrong', label: 'The greeting did not say my name' },
] as const;

export function NotHerSheet({ open, onClose, creatorName, spentMinor }: {
  open: boolean; onClose: () => void; creatorName: string; spentMinor: number;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => { if (!open) { setReason(null); setSubmitted(false); } }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="File a guarantee claim">
      <button className="absolute inset-0 bg-ground/80 backdrop-blur-sm" onClick={onClose} aria-label="Close" />

      <div className="animate-rise relative w-full max-w-md rounded-t-[26px] border border-hairline bg-surface p-6 sm:rounded-[26px]">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-raised-2 sm:hidden" />

        {!submitted ? (
          <>
            <h2 className="font-display text-[20px] font-bold tracking-tight">Not her?</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
              Tell us what is wrong. We check the presence log for this session — not just what you or
              {' '}{creatorName} say about it.
            </p>

            <fieldset className="mt-5">
              <legend className="sr-only">What is wrong?</legend>
              <div className="space-y-2">
                {REASONS.map((r) => (
                  <label key={r.id}
                         className={cx(
                           'press flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 text-[14px] transition-colors',
                           reason === r.id ? 'border-danger/50 bg-danger/5' : 'border-hairline hover:border-ink-3',
                         )}>
                    <input type="radio" name="claim-reason" value={r.id} checked={reason === r.id}
                           onChange={() => setReason(r.id)}
                           className="h-4 w-4 accent-[var(--color-danger)]" />
                    {r.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-5 rounded-2xl border border-hairline bg-raised p-4">
              <div className="flex items-start gap-2.5">
                <ShieldTick className="mt-0.5 h-4 w-4 shrink-0 text-verified-soft" />
                <div>
                  <p className="text-[13px] font-medium">What happens next</p>
                  <Note>
                    If any presence check failed or is missing, {formatUsd(spentMinor)} returns to your wallet
                    automatically. If every check passed, a moderator reviews it — usually within a few hours.
                  </Note>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2.5">
              <Button variant="outline" full onClick={onClose}>Cancel</Button>
              <Button variant="danger" full disabled={!reason} onClick={() => setSubmitted(true)}>
                File claim
              </Button>
            </div>

            <Note>
              Claims are limited to 3 per 30 days. Repeated rejected claims affect your standing.
            </Note>
          </>
        ) : (
          <div className="animate-rise py-3 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-money-dim text-money">
              <ShieldTick className="h-7 w-7" />
            </span>
            <h2 className="mt-4 font-display text-[20px] font-bold tracking-tight">Claim filed</h2>
            <p className="mx-auto mt-2 max-w-xs text-[14px] leading-relaxed text-ink-2">
              We are pulling the presence log for this session now. You will hear back either way, and billing
              for this session is paused while we look.
            </p>
            <Button variant="ghost" full className="mt-6" onClick={onClose}>Back to the session</Button>
          </div>
        )}
      </div>
    </div>
  );
}
