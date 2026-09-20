'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatUsd } from '@snae/money';
import { timeAgo } from '@snae/media';
import { CoverArt, hueForSeed } from './cover-art';
import { ShieldTick } from './presence';
import { cx } from './primitives';

/**
 * Full-screen moment viewer.
 *
 * Story-style tap-through, with one deliberate difference from the format it
 * borrows: the action bar never leaves. On Instagram the point of a story is
 * the story. Here the point is to start a conversation, so "Talk now" is
 * pinned rather than buried behind a swipe-up.
 *
 * Auto-advance is paused on hold, which is the interaction people already
 * expect from this format.
 */

interface ReelItem {
  id: string;
  seed: string;
  caption: string | null;
  kind: string;
  createdAtIso: string;
  expiresAtIso: string | null;
  captureSource: string;
}

interface CreatorShape {
  slug: string;
  displayName: string;
  hue: number;
  status: 'live' | 'in_session' | 'booking_only' | 'offline';
  voicePerMinuteMinor: number;
  asyncMessageMinor: number;
  nextSlot: string | null;
}

const SLIDE_MS = 6000;
const TICK_MS = 50;

export function MomentViewer({ reel, startIndex, creator }: {
  reel: ReelItem[]; startIndex: number; creator: CreatorShape;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(startIndex);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = reel[index];

  const next = useCallback(() => {
    setElapsed(0);
    setIndex((i) => (i + 1 < reel.length ? i + 1 : i));
  }, [reel.length]);

  const prev = useCallback(() => {
    setElapsed(0);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const close = useCallback(() => router.push(`/${creator.slug}`), [router, creator.slug]);

  // Auto-advance.
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setElapsed((e) => {
        if (e + TICK_MS >= SLIDE_MS) {
          if (index + 1 < reel.length) { setIndex(index + 1); return 0; }
          return SLIDE_MS;
        }
        return e + TICK_MS;
      });
    }, TICK_MS);
    return () => clearInterval(t);
  }, [paused, index, reel.length]);

  // Keyboard: this is a real navigation surface, not a lightbox.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [next, prev, close]);

  const startHold = () => { holdTimer.current = setTimeout(() => setPaused(true), 180); };
  const endHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    setPaused(false);
  };

  if (!current) return null;
  const createdAt = new Date(current.createdAtIso);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ground">
      {/* Progress segments */}
      <div className="flex gap-1 px-3 pt-3">
        {reel.map((_, i) => (
          <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-75 ease-linear"
              style={{ width: i < index ? '100%' : i === index ? `${(elapsed / SLIDE_MS) * 100}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Link href={`/${creator.slug}`} className="press flex items-center gap-2.5">
          <span
            className="grid h-8 w-8 place-items-center rounded-full text-[12px] font-bold text-white/90"
            style={{ background: `linear-gradient(145deg, hsl(${creator.hue} 72% 52%), hsl(${(creator.hue + 46) % 360} 68% 38%))` }}
          >
            {creator.displayName.slice(0, 1)}
          </span>
          <span className="text-[14.5px] font-semibold">{creator.displayName}</span>
        </Link>
        <span className="text-[12px] text-ink-3">{timeAgo(createdAt)}</span>
        {current.captureSource === 'in_app' && (
          <span className="inline-flex items-center gap-1 text-[11px] text-verified-soft" title="Captured in the app">
            <ShieldTick className="h-3 w-3" /> in-app
          </span>
        )}
        <button onClick={close} className="press ml-auto grid h-8 w-8 place-items-center rounded-full text-ink-2 hover:bg-raised" aria-label="Close">
          <CloseIcon />
        </button>
      </div>

      {/* Stage */}
      <div
        className="relative flex-1 select-none"
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
      >
        <CoverArt
          key={current.id}
          seed={current.seed}
          hue={hueForSeed(creator.slug)}
          rounded={false}
          className="absolute inset-0 h-full w-full"
          alt={current.caption ?? `Moment from ${creator.displayName}`}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ground via-ground/60 to-transparent" />

        {/* Tap zones. Buttons, not divs, so this works from a keyboard too. */}
        <button onClick={prev} disabled={index === 0}
                className="absolute inset-y-0 left-0 w-1/3 disabled:cursor-default" aria-label="Previous" />
        <button onClick={next} disabled={index === reel.length - 1}
                className="absolute inset-y-0 right-0 w-1/3 disabled:cursor-default" aria-label="Next" />

        {current.caption && (
          <p className="absolute inset-x-0 bottom-0 px-5 pb-5 text-[15.5px] leading-relaxed">
            {current.caption}
          </p>
        )}

        {paused && (
          <span className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-ground/70 px-2.5 py-1 text-[11px] text-ink-2 backdrop-blur">
            paused
          </span>
        )}
      </div>

      {/* The action bar. Pinned on purpose — see the component note. */}
      <div className="border-t border-hairline bg-surface/90 px-4 py-3.5 backdrop-blur-xl">
        {creator.status === 'live' ? (
          <div className="flex gap-2.5">
            <Link href={`/${creator.slug}/start?m=voice`}
                  className="press inline-flex h-12 flex-1 items-center justify-center rounded-full bg-live text-[14.5px] font-semibold text-white shadow-[0_8px_24px_-10px_rgba(255,61,129,0.8)]">
              Talk now · {formatUsd(creator.voicePerMinuteMinor)}/min
            </Link>
            <Link href={`/${creator.slug}/start?m=text`}
                  className="press inline-flex h-12 items-center justify-center rounded-full border border-hairline px-5 text-[14.5px] font-medium">
              Text
            </Link>
          </div>
        ) : (
          <div className="flex gap-2.5">
            <Link href={`/${creator.slug}/message`}
                  className="press inline-flex h-12 flex-1 items-center justify-center rounded-full bg-raised-2 text-[14.5px] font-semibold">
              Reply to this · {formatUsd(creator.asyncMessageMinor)}
            </Link>
            <Link href={`/${creator.slug}`}
                  className="press inline-flex h-12 items-center justify-center rounded-full border border-hairline px-5 text-[14.5px] font-medium">
              Profile
            </Link>
          </div>
        )}
        {creator.status !== 'live' && creator.nextSlot && (
          <p className="mt-2 text-center text-[11.5px] text-ink-3">
            She&rsquo;s usually on {creator.nextSlot}. Replies within 24 hours or you&rsquo;re refunded.
          </p>
        )}
      </div>
    </div>
  );
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" /></svg>;
}
