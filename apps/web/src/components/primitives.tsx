import type { ReactNode, ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';
import Link from 'next/link';

/** Tiny class joiner — avoids a dependency for something this small. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

// ── Button ────────────────────────────────────────────────────────────────

type Variant = 'live' | 'verified' | 'ghost' | 'outline' | 'danger' | 'money';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  live: 'bg-live text-white shadow-[0_8px_28px_-8px_rgba(255,61,129,0.7)] hover:shadow-[0_10px_34px_-8px_rgba(255,61,129,0.85)]',
  verified: 'bg-verified text-white shadow-[0_8px_28px_-8px_rgba(124,92,255,0.65)]',
  money: 'bg-money text-ground font-semibold',
  ghost: 'bg-raised-2 text-ink hover:bg-[#221D33]',
  outline: 'border border-hairline text-ink hover:border-ink-3 bg-transparent',
  danger: 'bg-transparent border border-danger/40 text-danger hover:bg-danger/10',
};

const SIZE: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] rounded-full gap-1.5',
  md: 'h-11 px-5 text-sm rounded-full gap-2',
  lg: 'h-14 px-7 text-base rounded-full gap-2.5',
};

const BUTTON_BASE =
  'press inline-flex items-center justify-center font-medium transition-[background,box-shadow,border-color,opacity] duration-200 ' +
  'disabled:opacity-40 disabled:pointer-events-none select-none';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
}

export function Button({ variant = 'ghost', size = 'md', full, className, ...rest }: ButtonProps) {
  return <button className={cx(BUTTON_BASE, VARIANT[variant], SIZE[size], full && 'w-full', className)} {...rest} />;
}

interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: Variant;
  size?: Size;
  full?: boolean;
}

export function LinkButton({ href, variant = 'ghost', size = 'md', full, className, ...rest }: LinkButtonProps) {
  return <Link href={href} className={cx(BUTTON_BASE, VARIANT[variant], SIZE[size], full && 'w-full', className)} {...rest} />;
}

// ── Surfaces ──────────────────────────────────────────────────────────────

export function Card({ children, className, as: As = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' | 'li' }) {
  return (
    <As className={cx('rounded-[20px] border border-hairline bg-surface', className)}>
      {children}
    </As>
  );
}

export function SectionHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-4">
      <h2 className="font-display text-[19px] font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

/** A labelled statistic. Used across wallet, earnings and admin. */
export function Stat({ label, value, sub, tone = 'default' }: {
  label: string; value: string; sub?: string; tone?: 'default' | 'money' | 'muted';
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.09em] text-ink-3 mb-1.5">{label}</div>
      <div className={cx(
        'font-display text-2xl font-semibold tabular-nums tracking-tight',
        tone === 'money' && 'text-money',
        tone === 'muted' && 'text-ink-2',
      )}>{value}</div>
      {sub && <div className="text-xs text-ink-3 mt-1">{sub}</div>}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cx('h-px bg-hairline', className)} />;
}

/** Inline explanatory note. Compliance copy leans on this heavily. */
export function Note({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'warn' | 'verified' }) {
  return (
    <p className={cx(
      'text-[12.5px] leading-relaxed',
      tone === 'default' && 'text-ink-3',
      tone === 'warn' && 'text-warn/90',
      tone === 'verified' && 'text-verified-soft',
    )}>{children}</p>
  );
}
