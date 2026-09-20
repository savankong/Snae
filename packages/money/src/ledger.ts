import { assertNonNegative, splitByRate, type Minor } from './money.ts';
import { TAKE_RATES, REFERRAL, type BuyerSource } from '@snae/config';

/**
 * Append-only double-entry ledger (A.3). Entries are never updated or
 * deleted; corrections are compensating entries (§14). Every allocation
 * must balance to zero across accounts, which `assertBalanced` enforces
 * before anything is persisted.
 */

export type LedgerAccount =
  | 'creator_earnings'
  | 'platform_revenue'
  | 'referral_payable'
  | 'processor_fees'
  | 'reserve_hold'
  | 'buyer_wallet'
  | 'refund_dispute';

export type EntryType =
  | 'session_draw'
  | 'topup'
  | 'refund'
  | 'guarantee_refund'
  | 'commission'
  | 'clawback'
  | 'reserve'
  | 'reserve_release'
  | 'fee';

export interface LedgerEntry {
  accountType: LedgerAccount;
  /** Creator id, buyer id, or null for platform-level accounts. */
  accountId: string | null;
  /** Positive credits the account, negative debits it. */
  amountMinor: Minor;
  entryType: EntryType;
  /** When these funds clear for payout. Null means immediately available. */
  availableAt?: Date | null;
}

/** A balanced set of entries produced by one economic event. */
export interface Allocation {
  entries: LedgerEntry[];
  /** Convenience read-outs; always derived from `entries`, never stored separately. */
  creatorMinor: Minor;
  platformMinor: Minor;
  referralMinor: Minor;
}

export function assertBalanced(entries: LedgerEntry[]): void {
  const sum = entries.reduce((a, e) => a + e.amountMinor, 0);
  if (sum !== 0) {
    throw new Error(`Ledger allocation does not balance: sums to ${sum}, expected 0`);
  }
}

export interface AllocateSessionInput {
  buyerId: string;
  creatorId: string;
  grossMinor: Minor;
  /** Whether this buyer arrived via the creator's own link or the marketplace. */
  source: BuyerSource;
  isFoundingCreator: boolean;
  /**
   * The buyer's Home Creator, if any, and if it is NOT the creator being paid.
   * Cross-creator commission is owed only when a different creator referred him.
   */
  referringCreatorId?: string | null;
  /** Clearing date for creator earnings, set by the payout profile. */
  availableAt?: Date | null;
  /**
   * Rate overrides. §7.2 makes take and commission rates admin-configurable,
   * so callers pass the values in force at the time of the session rather than
   * this module reading a constant. Omitted, the launch defaults apply.
   */
  rates?: { creatorShare?: number; commission?: number };
}

/**
 * Allocate a session's gross spend across the ledger.
 *
 * The platform share absorbs the cross-creator commission — §8: commission is
 * "paid from platform share", never deducted from the creator who did the work.
 * This is why the commission is computed against gross but debited from the
 * platform's slice.
 */
export function allocateSession(input: AllocateSessionInput): Allocation {
  const gross = assertNonNegative(input.grossMinor, 'grossMinor');
  const table = input.source === 'creator' ? TAKE_RATES.creatorBrought : TAKE_RATES.marketplace;
  const rate = input.rates?.creatorShare ?? (input.isFoundingCreator ? table.founding : table.standard);
  const commissionRate = input.rates?.commission ?? REFERRAL.commissionRate;

  const { share: creatorMinor, remainder: platformGross } = splitByRate(gross, rate);

  // Commission is owed only to a *different* creator than the one being paid.
  const owesCommission =
    !!input.referringCreatorId && input.referringCreatorId !== input.creatorId;
  const referralMinor = owesCommission ? Math.round(gross * commissionRate) : 0;

  // The platform cannot pay out more commission than its own share.
  if (referralMinor > platformGross) {
    throw new Error(
      `Referral commission ${referralMinor} exceeds platform share ${platformGross}; ` +
        `take rate and commission rate are misconfigured.`,
    );
  }
  const platformMinor = platformGross - referralMinor;
  const availableAt = input.availableAt ?? null;

  const entries: LedgerEntry[] = [
    { accountType: 'buyer_wallet', accountId: input.buyerId, amountMinor: -gross, entryType: 'session_draw' },
    { accountType: 'creator_earnings', accountId: input.creatorId, amountMinor: creatorMinor, entryType: 'session_draw', availableAt },
    { accountType: 'platform_revenue', accountId: null, amountMinor: platformMinor, entryType: 'session_draw' },
  ];
  if (referralMinor > 0) {
    entries.push({
      accountType: 'referral_payable',
      accountId: input.referringCreatorId!,
      amountMinor: referralMinor,
      entryType: 'commission',
      availableAt,
    });
  }

  assertBalanced(entries);
  return { entries, creatorMinor, platformMinor, referralMinor };
}

/**
 * Reverse an allocation. Used for refunds, upheld guarantee claims, and lost
 * disputes. §14: refunded/disputed transactions earn no commission, so the
 * referral entry reverses too.
 */
export function reverseAllocation(
  allocation: Allocation,
  entryType: Extract<EntryType, 'refund' | 'guarantee_refund' | 'clawback'>,
): LedgerEntry[] {
  const reversed = allocation.entries.map((e) => ({
    accountType: e.accountType,
    accountId: e.accountId,
    amountMinor: -e.amountMinor,
    entryType,
    availableAt: null,
  }));
  assertBalanced(reversed);
  return reversed;
}

/** Wallet top-up. Processor fees are recorded against the platform, never the buyer. */
export function allocateTopUp(buyerId: string, grossMinor: Minor, processorFeeMinor: Minor): LedgerEntry[] {
  assertNonNegative(grossMinor, 'grossMinor');
  assertNonNegative(processorFeeMinor, 'processorFeeMinor');
  const entries: LedgerEntry[] = [
    { accountType: 'buyer_wallet', accountId: buyerId, amountMinor: grossMinor, entryType: 'topup' },
    { accountType: 'platform_revenue', accountId: null, amountMinor: -grossMinor, entryType: 'topup' },
  ];
  if (processorFeeMinor > 0) {
    entries.push(
      { accountType: 'processor_fees', accountId: null, amountMinor: processorFeeMinor, entryType: 'fee' },
      { accountType: 'platform_revenue', accountId: null, amountMinor: -processorFeeMinor, entryType: 'fee' },
    );
  }
  assertBalanced(entries);
  return entries;
}

/** Current balance for an account, derived only from entries — never cached as truth. */
export function balanceOf(entries: LedgerEntry[], accountType: LedgerAccount, accountId: string | null): Minor {
  return entries
    .filter((e) => e.accountType === accountType && e.accountId === accountId)
    .reduce((a, e) => a + e.amountMinor, 0);
}

/** Cleared earnings are those whose availableAt has passed. Pending is the rest. */
export function creatorBalances(entries: LedgerEntry[], creatorId: string, now = new Date()) {
  const mine = entries.filter((e) => e.accountType === 'creator_earnings' && e.accountId === creatorId);
  let cleared = 0;
  let pending = 0;
  for (const e of mine) {
    if (!e.availableAt || e.availableAt <= now) cleared += e.amountMinor;
    else pending += e.amountMinor;
  }
  return { cleared, pending, lifetime: cleared + pending };
}
