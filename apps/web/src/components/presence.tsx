import { sealFor, type Seal } from '@snae/presence';
import { cx } from './primitives';

/**
 * The Presence Seal (FR-006). This is the single most important element in the
 * product: it is the guarantee made visible on every card and conversation.
 *
 * It animates only in the `verified` state, and only as a slow pulse. A seal
 * that pulses is saying "she is here *now*" — so a stale or unverified seal
 * must sit completely still, or the animation would be making a claim the data
 * does not support.
 */

export function PresenceSeal({ lastPassAt, size = 'md', showLabel = true, now }: {
  lastPassAt: Date | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  now?: Date;
}) {
  const seal = sealFor(lastPassAt, now);
  return <PresenceSealView seal={seal} size={size} showLabel={showLabel} />;
}

export function PresenceSealView({ seal, size = 'md', showLabel = true }: {
  seal: Seal; size?: 'sm' | 'md' | 'lg'; showLabel?: boolean;
}) {
  const dot = { sm: 'h-1.5 w-1.5', md: 'h-2 w-2', lg: 'h-2.5 w-2.5' }[size];
  const text = { sm: 'text-[10.5px]', md: 'text-[11.5px]', lg: 'text-[13px]' }[size];
  const verified = seal.state === 'verified';

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium',
        text,
        verified && 'border-verified/35 bg-verified-dim text-verified-soft',
        seal.state === 'stale' && 'border-hairline bg-raised text-ink-3',
        seal.state === 'unverified' && 'border-hairline bg-raised text-ink-3',
      )}
      title={verified ? 'Verified live by the creator herself' : 'No recent presence check'}
    >
      <ShieldTick className={cx(dot === 'h-1.5 w-1.5' ? 'h-3 w-3' : 'h-3.5 w-3.5', verified ? 'text-verified-soft' : 'text-ink-3')} />
      {showLabel && <span className="whitespace-nowrap">{seal.label}</span>}
    </span>
  );
}

/**
 * The live dot. Pink, pulsing, and used *only* where a creator is genuinely
 * online right now — the design brief is explicit that availability must not be
 * over-promised, so this element is deliberately hard to reuse loosely.
 */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cx('relative inline-flex', className)}>
      <span className="absolute inline-flex h-full w-full rounded-full bg-live opacity-70 animate-ping" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-live" />
    </span>
  );
}

export function StatusPill({ status, nextSlot, queueLength }: {
  status: 'live' | 'in_session' | 'booking_only' | 'offline';
  nextSlot?: string | null;
  queueLength?: number;
}) {
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-live-dim border border-live/40 px-2.5 py-1 text-[11.5px] font-semibold text-live-soft">
        <LiveDot /> On now
      </span>
    );
  }
  if (status === 'in_session') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-live-dim/60 border border-live/25 px-2.5 py-1 text-[11.5px] font-medium text-live-soft/90">
        In a session{queueLength ? ` · ${queueLength} waiting` : ''}
      </span>
    );
  }
  if (status === 'booking_only') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-verified-dim border border-verified/30 px-2.5 py-1 text-[11.5px] font-medium text-verified-soft">
        {nextSlot ? `Back ${nextSlot}` : 'Booking only'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-1 text-[11.5px] font-medium text-ink-3">
      {nextSlot ? `Next: ${nextSlot}` : 'Offline'}
    </span>
  );
}

export function ShieldTick({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 2.5 4.5 5.8v5.4c0 4.6 3.2 8.9 7.5 10.3 4.3-1.4 7.5-5.7 7.5-10.3V5.8L12 2.5Z"
            stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m8.8 11.9 2.2 2.2 4.3-4.3" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Generated avatar mark. Deliberately not a photograph: design/v2/README warns
 * that stock imagery depicting an identifiable person as an adult-services
 * creator is exactly what those licences prohibit, so the repo ships none.
 */
export function AvatarMark({ name, hue, size = 56, ring }: {
  name: string; hue: number; size?: number; ring?: 'live' | 'scheduled' | 'offline' | null;
}) {
  const initial = name.slice(0, 1).toUpperCase();
  const ringColor = ring === 'live' ? 'var(--color-live)' : ring === 'scheduled' ? 'var(--color-verified)' : 'var(--color-offline)';
  const pad = ring ? 3 : 0;

  return (
    <span
      className="inline-grid place-items-center rounded-full shrink-0"
      style={{
        width: size + pad * 2 + (ring ? 4 : 0),
        height: size + pad * 2 + (ring ? 4 : 0),
        background: ring ? `conic-gradient(from 140deg, ${ringColor}, color-mix(in srgb, ${ringColor} 25%, transparent), ${ringColor})` : 'transparent',
        padding: ring ? 2 : 0,
      }}
    >
      <span className="grid place-items-center rounded-full bg-ground" style={{ width: size + pad * 2, height: size + pad * 2 }}>
        <span
          className="grid place-items-center rounded-full font-display font-semibold text-white/90"
          style={{
            width: size, height: size, fontSize: size * 0.38,
            background: `linear-gradient(145deg, hsl(${hue} 72% 52%), hsl(${(hue + 46) % 360} 68% 38%))`,
          }}
          aria-hidden="true"
        >
          {initial}
        </span>
      </span>
    </span>
  );
}
