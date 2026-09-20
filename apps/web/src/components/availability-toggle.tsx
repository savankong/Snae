'use client';

import { useState } from 'react';
import { Card, Note, cx } from './primitives';

/**
 * Going live (FR-002). Availability carries an expiry so a creator is never
 * shown as live after she walks away from her phone — the design brief is
 * emphatic that the marketplace must not over-promise availability, and a
 * stale "live" badge is the fastest way to break that.
 */
const DURATIONS = [30, 60, 120, 180] as const;

export function AvailabilityToggle() {
  const [live, setLive] = useState(false);
  const [minutes, setMinutes] = useState<number>(60);
  const [voice, setVoice] = useState(true);
  const [text, setText] = useState(true);

  return (
    <Card className={cx('overflow-hidden transition-colors', live && 'border-live/35')}>
      <div className={cx('p-5 transition-colors', live ? 'bg-live-dim/40' : 'bg-surface')}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLive((v) => !v)}
            role="switch"
            aria-checked={live}
            aria-label="Go live"
            className={cx(
              'press relative h-9 w-16 shrink-0 rounded-full transition-colors duration-300',
              live ? 'bg-live' : 'bg-raised-2',
            )}
          >
            <span className={cx(
              'absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-transform duration-300',
              live ? 'translate-x-8' : 'translate-x-1',
            )} />
          </button>

          <div className="flex-1">
            <div className="font-display text-[18px] font-semibold tracking-tight">
              {live ? "You're live" : "You're offline"}
            </div>
            <div className="text-[13px] text-ink-2">
              {live ? `Visible for the next ${minutes} minutes` : 'Nobody can start a session with you'}
            </div>
          </div>

          {live && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-live animate-pulse" />}
        </div>
      </div>

      <div className="border-t border-hairline p-5">
        <div className="mb-2.5 text-[13px] font-medium text-ink-2">Stay visible for</div>
        <div className="grid grid-cols-4 gap-2">
          {DURATIONS.map((d) => (
            <button key={d} onClick={() => setMinutes(d)} aria-pressed={minutes === d}
                    className={cx(
                      'press h-10 rounded-xl border text-[13px] font-medium transition-colors',
                      minutes === d ? 'border-live/50 bg-live-dim text-live-soft' : 'border-hairline hover:border-ink-3',
                    )}>
              {d < 60 ? `${d}m` : `${d / 60}h`}
            </button>
          ))}
        </div>
        <Note>
          We take you offline automatically when this runs out, so nobody sees you as available when you have
          put your phone down.
        </Note>

        <div className="mt-5 flex gap-2.5">
          <ModalityChip label="Voice" on={voice} onClick={() => setVoice((v) => !v)} />
          <ModalityChip label="Text" on={text} onClick={() => setText((v) => !v)} />
          <ModalityChip label="Video" on={false} disabled />
        </div>
      </div>
    </Card>
  );
}

function ModalityChip({ label, on, onClick, disabled }: { label: string; on: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-pressed={on}
            className={cx(
              'press h-9 flex-1 rounded-full border text-[13px] font-medium transition-colors disabled:opacity-35',
              on ? 'border-money/45 bg-money-dim text-money' : 'border-hairline text-ink-2',
            )}>
      {label}{disabled ? ' · soon' : ''}
    </button>
  );
}
