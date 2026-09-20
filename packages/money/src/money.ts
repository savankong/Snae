/**
 * All money is integer minor units (cents). §14: "All money is stored in
 * integer cents." No float arithmetic touches a balance anywhere in this
 * codebase, and no financial math happens in the frontend (§15.3).
 */

export type Minor = number;

export function assertMinor(v: number, label = 'amount'): Minor {
  if (!Number.isInteger(v)) throw new RangeError(`${label} must be an integer minor unit, got ${v}`);
  if (!Number.isSafeInteger(v)) throw new RangeError(`${label} exceeds safe integer range`);
  return v;
}

export function assertNonNegative(v: number, label = 'amount'): Minor {
  assertMinor(v, label);
  if (v < 0) throw new RangeError(`${label} must be non-negative, got ${v}`);
  return v;
}

/**
 * Split a gross amount by a rate, rounding the creator's share HALF-UP and
 * giving the remainder to the platform. This guarantees the parts always sum
 * to the whole — the property that keeps the ledger balanced.
 */
export function splitByRate(gross: Minor, rate: number): { share: Minor; remainder: Minor } {
  assertNonNegative(gross, 'gross');
  if (!(rate >= 0 && rate <= 1)) throw new RangeError(`rate must be within 0..1, got ${rate}`);
  const share = Math.round(gross * rate);
  return { share, remainder: gross - share };
}

export function formatUsd(minor: Minor): string {
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  return `${sign}$${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** Compact form for dense surfaces: $25 rather than $25.00 when whole. */
export function formatUsdCompact(minor: Minor): string {
  return minor % 100 === 0 ? `$${minor / 100}` : formatUsd(minor);
}

export function parseUsdToMinor(input: string): Minor | null {
  const cleaned = input.replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [whole = '0', frac = ''] = cleaned.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}
