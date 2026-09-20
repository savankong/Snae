'use client';

import { useState } from 'react';
import { Card, Note, cx } from './primitives';

/**
 * Post-session rating (§3.2). Structured checkboxes only — never free text.
 *
 * This is a hard constraint, not a simplification: §14 states free-text creator
 * notes are never shared between creators, and §16 asks counsel to confirm
 * Buyer Standing reads as an internal trust feature rather than a consumer
 * report. Structured-only inputs are what make both defensible, so there is
 * deliberately no comment box here.
 */
const CRITERIA = [
  { id: 'respectful', label: 'She was respectful and present' },
  { id: 'as_described', label: 'The session was what I expected' },
  { id: 'would_return', label: "I'd talk to her again" },
] as const;

export function RateSession({ creatorName }: { creatorName: string }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <Card className="animate-rise mt-6 p-5 text-center">
        <p className="text-[14px] text-ink-2">Thanks — that helps other buyers and it helps {creatorName}.</p>
      </Card>
    );
  }

  return (
    <Card className="mt-6 p-5">
      <h2 className="font-display text-[16px] font-semibold tracking-tight">How was it?</h2>
      <Note>Tick what applies. We never share written notes between creators.</Note>

      <div className="mt-4 space-y-2">
        {CRITERIA.map((cr) => {
          const on = checked.has(cr.id);
          return (
            <label key={cr.id}
                   className={cx(
                     'press flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 text-[14px] transition-colors',
                     on ? 'border-money/45 bg-money-dim/40' : 'border-hairline hover:border-ink-3',
                   )}>
              <input type="checkbox" checked={on} className="h-4 w-4 accent-[var(--color-money)]"
                     onChange={() => setChecked((prev) => {
                       const next = new Set(prev);
                       if (next.has(cr.id)) next.delete(cr.id); else next.add(cr.id);
                       return next;
                     })} />
              {cr.label}
            </label>
          );
        })}
      </div>

      <button onClick={() => setDone(true)}
              className="press mt-4 h-11 w-full rounded-full bg-raised-2 text-[14px] font-semibold hover:bg-[#221D33]">
        Submit rating
      </button>
    </Card>
  );
}
