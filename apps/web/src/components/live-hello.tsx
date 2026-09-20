'use client';

import { useEffect, useReducer, useRef } from 'react';
import Link from 'next/link';
import { formatUsd } from '@snae/money';
import { AvatarMark, ShieldTick } from './presence';
import { Button, Note, cx } from './primitives';

/**
 * The Live Hello gate (FR-004, §12.1 steps 6–7).
 *
 * This is the moment the entire product is built around, so the interface does
 * one thing at a time and never lies about where it is. Two rules shaped it:
 *
 *   1. Billing cannot start until the check passes (§14). The running cost
 *      readout therefore does not exist on this screen at all — it appears only
 *      once the session is live. A meter visible during verification would
 *      imply the buyer is already paying.
 *   2. The buyer must see or hear the greeting *before* billing begins. So
 *      "Start the session" is not offered until playback has happened.
 *
 * The animation carries the waiting: a breathing ring while she records, a
 * satisfying settle when the provider confirms the match. Waiting is the
 * product's main friction and is worth spending motion on.
 */

type Stage =
  | 'requesting'    // session requested, waiting for her to accept
  | 'accepted'      // she accepted, about to record
  | 'recording'     // she is recording the greeting
  | 'verifying'     // provider is running liveness + face match
  | 'ready'         // passed; buyer can play it
  | 'played'        // buyer has heard it; billing may now start
  | 'failed';       // check did not pass — no charge

interface State { stage: Stage; elapsedMs: number }

type Action = { type: 'advance'; to: Stage } | { type: 'tick' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'advance': return { stage: action.to, elapsedMs: 0 };
    case 'tick': return { ...state, elapsedMs: state.elapsedMs + 100 };
  }
}

const SCRIPT: Array<{ from: Stage; to: Stage; afterMs: number }> = [
  { from: 'requesting', to: 'accepted', afterMs: 1800 },
  { from: 'accepted', to: 'recording', afterMs: 900 },
  { from: 'recording', to: 'verifying', afterMs: 4200 },
  { from: 'verifying', to: 'ready', afterMs: 1600 },
];

export function LiveHelloGate({ creator, buyerName, modality, ratePerUnit, unitLabel, walletBalanceMinor }: {
  creator: { displayName: string; hue: number; slug: string };
  buyerName: string;
  modality: 'voice' | 'text';
  ratePerUnit: number;
  unitLabel: string;
  walletBalanceMinor: number;
}) {
  const [state, dispatch] = useReducer(reducer, { stage: 'requesting', elapsedMs: 0 });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Demo choreography. In production each transition is driven by a server
  // event from the Presence service, never by a client timer.
  useEffect(() => {
    const step = SCRIPT.find((s) => s.from === state.stage);
    if (!step) return;
    const t = setTimeout(() => dispatch({ type: 'advance', to: step.to }), step.afterMs);
    timers.current.push(t);
    return () => clearTimeout(t);
  }, [state.stage]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  const copy = STAGE_COPY[state.stage];
  const active = state.stage === 'recording' || state.stage === 'verifying';

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <div className="text-center">
        {/* ── The ring ─────────────────────────────────────────────── */}
        <div className="relative mx-auto grid h-[168px] w-[168px] place-items-center">
          {active && (
            <>
              <span className="absolute inset-0 rounded-full border-2 border-live/30 animate-ping" style={{ animationDuration: '2.4s' }} />
              <span className="absolute inset-[14px] rounded-full border border-live/20 animate-ping" style={{ animationDuration: '2.4s', animationDelay: '0.5s' }} />
            </>
          )}
          {state.stage === 'ready' || state.stage === 'played' ? (
            <span className="absolute inset-0 rounded-full border-2 border-money/50" />
          ) : null}
          {state.stage === 'failed' && <span className="absolute inset-0 rounded-full border-2 border-danger/50" />}

          <div className={cx('transition-transform duration-500', active && 'animate-breathe')}>
            <AvatarMark name={creator.displayName} hue={creator.hue} size={120} ring={null} />
          </div>

          {/* Verified tick settles in when the provider confirms. */}
          {(state.stage === 'ready' || state.stage === 'played') && (
            <span className="animate-rise absolute bottom-1 right-1 grid h-11 w-11 place-items-center rounded-full border-4 border-ground bg-money text-ground">
              <ShieldTick className="h-5 w-5" />
            </span>
          )}
        </div>

        <h1 className="animate-count mt-7 font-display text-[24px] font-bold tracking-tight" key={state.stage}>
          {copy.title.replace('{name}', creator.displayName).replace('{buyer}', buyerName)}
        </h1>
        <p className="mx-auto mt-2.5 max-w-sm text-[14.5px] leading-relaxed text-ink-2">
          {copy.body.replace('{name}', creator.displayName).replace('{buyer}', buyerName)}
        </p>

        {/* ── Stage rail ───────────────────────────────────────────── */}
        <ol className="mt-8 flex items-center justify-center gap-1.5" aria-label="Verification progress">
          {(['accepted', 'recording', 'verifying', 'ready'] as const).map((s) => {
            const order: Stage[] = ['requesting', 'accepted', 'recording', 'verifying', 'ready', 'played'];
            const done = order.indexOf(state.stage) > order.indexOf(s);
            const current = state.stage === s;
            return (
              <li key={s}
                  className={cx(
                    'h-1 rounded-full transition-all duration-500',
                    current ? 'w-10 bg-live' : done ? 'w-6 bg-money/70' : 'w-6 bg-raised-2',
                  )}
              />
            );
          })}
        </ol>

        {/* ── Actions ──────────────────────────────────────────────── */}
        <div className="mt-8">
          {state.stage === 'ready' && (
            <div className="animate-rise">
              <Button variant="money" size="lg" full onClick={() => dispatch({ type: 'advance', to: 'played' })}>
                <PlayIcon /> Play her hello
              </Button>
              <Note>Nothing is charged until you have heard it.</Note>
            </div>
          )}

          {state.stage === 'played' && (
            <div className="animate-rise space-y-3">
              <div className="rounded-2xl border border-money/25 bg-money-dim/50 p-4 text-left">
                <p className="text-[14px] leading-relaxed">
                  <span className="text-money">&ldquo;</span>
                  Hey {buyerName} — it&rsquo;s {creator.displayName}. I&rsquo;m here, it&rsquo;s really me.
                  <span className="text-money">&rdquo;</span>
                </p>
                <p className="mt-2 text-[11.5px] text-ink-3">
                  Liveness and face match confirmed against her verified ID · just now
                </p>
              </div>
              <Link href={`/session/demo?m=${modality}&c=${creator.slug}`}
                    className="press inline-flex h-14 w-full items-center justify-center rounded-full bg-live text-base font-semibold text-white shadow-[0_10px_34px_-10px_rgba(255,61,129,0.85)]">
                Start the session
              </Link>
              <Note>
                Billing starts now — {formatUsd(ratePerUnit)} {unitLabel}. Your balance is {formatUsd(walletBalanceMinor)}.
              </Note>
            </div>
          )}

          {state.stage === 'failed' && (
            <div className="animate-rise space-y-3">
              <Link href={`/${creator.slug}`}
                    className="press inline-flex h-12 w-full items-center justify-center rounded-full bg-raised-2 text-sm font-semibold">
                Back to her profile
              </Link>
              <Note tone="warn">You have not been charged. A failed Live Hello cancels the session at no cost.</Note>
            </div>
          )}

          {(state.stage === 'requesting' || state.stage === 'accepted' || state.stage === 'recording' || state.stage === 'verifying') && (
            <Link href={`/${creator.slug}`} className="text-[13.5px] text-ink-3 underline-offset-4 hover:text-ink hover:underline">
              Cancel
            </Link>
          )}
        </div>

        {/* ── Standing promise ─────────────────────────────────────── */}
        <div className="mt-10 rounded-2xl border border-hairline bg-surface p-4 text-left">
          <div className="flex items-start gap-3">
            <ShieldTick className="mt-0.5 h-5 w-5 shrink-0 text-verified-soft" />
            <div>
              <p className="text-[13.5px] font-medium">Why she says your name</p>
              <Note>
                A greeting that says &ldquo;{buyerName}&rdquo; cannot be pre-recorded or handed to a chatter. That is
                the whole guarantee, and it runs before every single session.
              </Note>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const STAGE_COPY: Record<Stage, { title: string; body: string }> = {
  requesting: { title: 'Asking {name}…', body: 'She sees your request now. She can accept or decline.' },
  accepted:   { title: '{name} accepted', body: 'She is about to record a live greeting for you.' },
  recording:  { title: 'She is recording', body: 'A few seconds, live, saying your name. This is what makes it hers.' },
  verifying:  { title: 'Checking it is her', body: 'Matching the greeting for liveness against the ID she verified with.' },
  ready:      { title: "It's her", body: 'Liveness and face match both passed. Have a listen before anything is charged.' },
  played:     { title: 'Ready when you are', body: 'You have heard her. Billing starts the moment you begin.' },
  failed:     { title: "That wasn't her", body: 'The check did not pass, so the session is cancelled and nothing is charged.' },
};

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M8 5.2v13.6a.7.7 0 0 0 1.07.6l10.5-6.8a.7.7 0 0 0 0-1.2L9.07 4.6A.7.7 0 0 0 8 5.2Z" />
    </svg>
  );
}
