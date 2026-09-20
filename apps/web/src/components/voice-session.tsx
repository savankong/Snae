'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatUsd } from '@snae/money';
import { AvatarMark, ShieldTick } from './presence';
import { Button, cx } from './primitives';
import { NotHerSheet } from './not-her';

/**
 * Live voice session (FR-009).
 *
 * Two things make this screen different from every other call UI:
 *
 *   1. A running cost meter. The buyer always knows what he is spending, in
 *      dollars, as it happens — §6.1: "Understand exactly what it costs, in
 *      dollars, before starting."
 *   2. A permanently visible "Not her?" control (§2.2). It is deliberately not
 *      hidden behind a menu; the guarantee is only worth something if acting on
 *      it is obvious mid-session.
 *
 * The displayed timer is a *display* only. §A.2: "Do not rely on client timers
 * for metered billing" — the authoritative meter runs server-side off provider
 * events, and this readout would be reconciled against it on settlement.
 */
export function VoiceSession({ creator, perMinuteMinor, walletBalanceMinor }: {
  creator: { displayName: string; hue: number; slug: string };
  perMinuteMinor: number;
  walletBalanceMinor: number;
}) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [claimOpen, setClaimOpen] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt.current) / 1000)), 250);
    return () => clearInterval(t);
  }, []);

  // Billed per whole minute started, matching meterVoice() on the server.
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  const spentMinor = minutes * perMinuteMinor;
  const remainingMinor = Math.max(0, walletBalanceMinor - spentMinor);
  const minutesLeft = Math.floor(remainingMinor / perMinuteMinor);
  const lowBalance = minutesLeft <= 3;

  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden">
      {/* Ambient field — slow, dim, never competing with the controls. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[18%] h-[420px] w-[420px] -translate-x-1/2 rounded-full opacity-25 blur-[100px] animate-breathe"
             style={{ background: `radial-gradient(circle, hsl(${creator.hue} 72% 52%), transparent 70%)` }} />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-6 pt-10">
        {/* Presence seal stays pinned during the call — the claim is continuous. */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-verified/35 bg-verified-dim px-3 py-1.5 text-[12px] font-medium text-verified-soft">
          <ShieldTick className="h-3.5 w-3.5" /> Verified live at the start of this call
        </span>

        <div className="relative mt-9">
          <span className="absolute inset-[-10px] rounded-full border border-live/25 animate-ping" style={{ animationDuration: '3s' }} />
          <AvatarMark name={creator.displayName} hue={creator.hue} size={144} ring="live" />
        </div>

        <h1 className="mt-7 font-display text-[28px] font-bold tracking-tight">{creator.displayName}</h1>

        <div className="mt-2 flex items-center gap-2 text-ink-2">
          <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse" />
          <span className="font-display text-[19px] tabular-nums tracking-tight">{fmtClock(seconds)}</span>
        </div>

        {/* ── The meter ─────────────────────────────────────────────── */}
        <div className="mt-8 w-full max-w-xs rounded-2xl border border-hairline bg-surface/80 p-4 backdrop-blur">
          <div className="flex items-baseline justify-between">
            <span className="text-[11.5px] uppercase tracking-[0.08em] text-ink-3">This call</span>
            <span key={spentMinor} className="animate-count font-display text-[22px] font-semibold tabular-nums tracking-tight">
              {formatUsd(spentMinor)}
            </span>
          </div>
          <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-raised-2">
            <div className={cx('h-full rounded-full transition-[width] duration-500', lowBalance ? 'bg-warn' : 'bg-money')}
                 style={{ width: `${Math.min(100, (spentMinor / Math.max(walletBalanceMinor, 1)) * 100)}%` }} />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[12px]">
            <span className="text-ink-3">{formatUsd(perMinuteMinor)}/min</span>
            <span className={lowBalance ? 'text-warn' : 'text-ink-3'}>
              {minutesLeft} min left in wallet
            </span>
          </div>
          {lowBalance && (
            <button onClick={() => router.push('/wallet')}
                    className="press mt-3 h-9 w-full rounded-full bg-money text-[13px] font-semibold text-ground">
              Top up without ending the call
            </button>
          )}
        </div>
      </div>

      {/* ── Controls ──────────────────────────────────────────────── */}
      <div className="relative px-6 pb-10 pt-8">
        <div className="mx-auto flex max-w-sm items-end justify-center gap-7">
          <CallControl label={muted ? 'Unmute' : 'Mute'} active={muted} onClick={() => setMuted((v) => !v)}>
            {muted ? <MicOffIcon /> : <MicIcon />}
          </CallControl>

          <button
            onClick={() => router.push(`/session/demo/end?c=${creator.slug}&s=${seconds}`)}
            className="press grid h-[68px] w-[68px] place-items-center rounded-full bg-danger text-white shadow-[0_10px_30px_-8px_rgba(255,77,77,0.7)]"
            aria-label="End call"
          >
            <EndCallIcon />
          </button>

          <CallControl label="Speaker" active={speaker} onClick={() => setSpeaker((v) => !v)}>
            <SpeakerIcon />
          </CallControl>
        </div>

        {/* The guarantee, always reachable. */}
        <div className="mt-8 text-center">
          <button onClick={() => setClaimOpen(true)}
                  className="press rounded-full border border-hairline px-4 py-2 text-[13px] font-medium text-ink-2 hover:border-danger/40 hover:text-danger">
            Not her?
          </button>
          <p className="mx-auto mt-2.5 max-w-xs text-[11.5px] leading-relaxed text-ink-3">
            Tap this any time. If the checks did not pass, you are refunded automatically.
          </p>
        </div>
      </div>

      <NotHerSheet open={claimOpen} onClose={() => setClaimOpen(false)} creatorName={creator.displayName} spentMinor={spentMinor} />
    </div>
  );
}

function CallControl({ children, label, active, onClick }: {
  children: React.ReactNode; label: string; active?: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="press flex flex-col items-center gap-2" aria-pressed={active}>
      <span className={cx(
        'grid h-14 w-14 place-items-center rounded-full transition-colors',
        active ? 'bg-ink text-ground' : 'bg-raised-2 text-ink',
      )}>
        {children}
      </span>
      <span className="text-[11.5px] text-ink-3">{label}</span>
    </button>
  );
}

function fmtClock(s: number): string {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function MicIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" /></svg>;
}
function MicOffIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 4l16 16" strokeLinecap="round" /><path d="M9 9v2a3 3 0 0 0 4.5 2.6M15 11V6a3 3 0 0 0-5.8-1.1" strokeLinecap="round" /><path d="M5 11a7 7 0 0 0 10.9 5.8M12 18v3" strokeLinecap="round" /></svg>;
}
function SpeakerIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" strokeLinejoin="round" /><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10" strokeLinecap="round" /></svg>;
}
function EndCallIcon() {
  return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true"><path d="M12 9c-2.3 0-4.5.4-6.5 1.2v2.9c0 .5-.3.9-.7 1.1-1 .4-2 1-2.8 1.7-.2.2-.5.3-.8.3s-.6-.1-.8-.4L.3 13.9a1.1 1.1 0 0 1 0-1.6C3.3 9.5 7.4 8 12 8s8.7 1.5 11.7 4.3c.4.4.4 1.1 0 1.6l-2.1 1.9c-.2.2-.5.4-.8.4s-.6-.1-.8-.3c-.8-.7-1.8-1.3-2.8-1.7-.4-.2-.7-.6-.7-1.1v-2.9C16.5 9.4 14.3 9 12 9Z" /></svg>;
}
