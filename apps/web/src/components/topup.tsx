'use client';

import { useState } from 'react';
import { WALLET } from '@snae/config';
import { formatUsd, formatUsdCompact, parseUsdToMinor } from '@snae/money';
import { Note, cx } from './primitives';

/**
 * Wallet top-up (FR-011, §7.1).
 *
 * A dollar-denominated prepaid wallet, never proprietary tokens — §7.1 is
 * explicit that sessions "draw down in dollars", which keeps pricing legible
 * and avoids per-message card fees. The UI therefore shows real dollars at
 * every step and never invents a credit unit.
 *
 * The real implementation hands off to a processor-hosted checkout (§A.4:
 * Snae never touches raw card data) with an idempotency key on the transaction
 * (§15.3), so a double-tap cannot double-charge.
 */
export function TopUp({ balanceMinor }: { balanceMinor: number }) {
  const [selected, setSelected] = useState<number | 'custom'>(WALLET.topUpPresetsMinor[1]!);
  const [custom, setCustom] = useState('');
  const [pending, setPending] = useState(false);

  const customMinor = parseUsdToMinor(custom);
  const amountMinor = selected === 'custom' ? customMinor : selected;
  const customInvalid =
    selected === 'custom' && custom !== '' &&
    (customMinor === null || customMinor < WALLET.customMinMinor || customMinor > WALLET.customMaxMinor);
  const canSubmit = !!amountMinor && !customInvalid && !pending;

  return (
    <div>
      <fieldset>
        <legend className="mb-3 text-[13px] font-medium text-ink-2">Choose an amount</legend>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {WALLET.topUpPresetsMinor.map((minor) => (
            <button key={minor} onClick={() => setSelected(minor)}
                    aria-pressed={selected === minor}
                    className={cx(
                      'press h-[68px] rounded-2xl border font-display text-[21px] font-semibold tabular-nums tracking-tight transition-colors',
                      selected === minor
                        ? 'border-money/60 bg-money-dim text-money'
                        : 'border-hairline bg-surface hover:border-ink-3',
                    )}>
              {formatUsdCompact(minor)}
            </button>
          ))}
        </div>

        <button onClick={() => setSelected('custom')}
                aria-pressed={selected === 'custom'}
                className={cx(
                  'press mt-2.5 flex h-[56px] w-full items-center gap-3 rounded-2xl border px-4 transition-colors',
                  selected === 'custom' ? 'border-money/60 bg-money-dim/50' : 'border-hairline bg-surface hover:border-ink-3',
                )}>
          <span className="text-[14px] text-ink-2">Another amount</span>
          {selected === 'custom' && (
            <span className="ml-auto flex items-center gap-1">
              <span className="font-display text-[19px] text-ink-3">$</span>
              <input
                autoFocus
                inputMode="decimal"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="0.00"
                aria-label="Custom top-up amount in dollars"
                className="w-24 bg-transparent text-right font-display text-[19px] font-semibold tabular-nums outline-none placeholder:text-ink-3"
              />
            </span>
          )}
        </button>
      </fieldset>

      {customInvalid && (
        <p className="mt-2.5 text-[12.5px] text-danger" role="alert">
          Enter between {formatUsdCompact(WALLET.customMinMinor)} and {formatUsdCompact(WALLET.customMaxMinor)}.
        </p>
      )}

      {/* Payment method — processor-hosted, so no card fields live in this app. */}
      <div className="mt-5">
        <div className="mb-2.5 text-[13px] font-medium text-ink-2">Pay with</div>
        <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface p-4">
          <span className="grid h-9 w-12 place-items-center rounded-lg bg-raised-2 text-[10px] font-bold tracking-wider">VISA</span>
          <div className="flex-1">
            <div className="text-[14px]">Card ending 4242</div>
            <div className="text-[12px] text-ink-3">Billed discreetly as &ldquo;SNAE DIGITAL&rdquo;</div>
          </div>
          <button className="press text-[13px] text-ink-3 hover:text-ink">Change</button>
        </div>
      </div>

      <button
        disabled={!canSubmit}
        onClick={() => { setPending(true); setTimeout(() => setPending(false), 1400); }}
        className={cx(
          'press mt-5 flex h-14 w-full items-center justify-between rounded-full px-6 text-[15px] font-semibold transition-all',
          canSubmit ? 'bg-money text-ground' : 'bg-raised-2 text-ink-3',
        )}
      >
        <span>{pending ? 'Opening secure checkout…' : 'Add to wallet'}</span>
        <span className="tabular-nums">{amountMinor ? formatUsd(amountMinor) : '—'}</span>
      </button>

      <div className="mt-3 space-y-1.5">
        <Note>
          New balance would be {formatUsd(balanceMinor + (amountMinor ?? 0))}. Funds stay in your wallet — we
          never charge your card per message.
        </Note>
        <Note>
          Payment is taken on our processor&rsquo;s secure page. Snae never sees or stores your card number.
        </Note>
      </div>
    </div>
  );
}
