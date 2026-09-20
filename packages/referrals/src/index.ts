import { REFERRAL } from '@snae/config';

/**
 * Home Creator attribution and cross-creator commission (§8, FR-014/FR-015).
 *
 * v1.0 showed a creator's own fans other creators right after they paid, which
 * "reads as poaching" (§8). v2.0 gives the creator control: her buyers only
 * ever see creators she picked, and never during or just after a session with
 * her. Both rules are enforced here rather than in the UI, so a new surface
 * cannot reintroduce the poaching moment by accident.
 */

export interface HomeAttribution {
  buyerId: string;
  homeCreatorId: string;
  source: 'creator' | 'affiliate';
  startedAt: Date;
  expiresAt: Date;
}

/**
 * §14: "Home Creator is set on the first qualifying cleared purchase through
 * her link; later link clicks do not overwrite it." A click alone never
 * attributes — only cleared money does.
 */
export function establishAttribution(input: {
  existing: HomeAttribution | null;
  buyerId: string;
  creatorId: string;
  source: 'creator' | 'affiliate';
  clearedAt: Date;
}): HomeAttribution | null {
  if (input.existing && input.existing.expiresAt > input.clearedAt) return null; // Already attributed; do not overwrite.
  const expiresAt = new Date(input.clearedAt);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + REFERRAL.windowDays);
  return {
    buyerId: input.buyerId,
    homeCreatorId: input.creatorId,
    source: input.source,
    startedAt: input.clearedAt,
    expiresAt,
  };
}

export function isAttributionActive(a: HomeAttribution | null, now = new Date()): boolean {
  return !!a && a.expiresAt > now;
}

/**
 * Is a cross-creator commission owed on this spend?
 *
 * §14: refunded, disputed, fraudulent, self-referred, or prohibited
 * transactions earn nothing. Self-referral is the important one — a creator
 * never earns commission on her own sessions.
 */
export function commissionOwed(input: {
  attribution: HomeAttribution | null;
  sellingCreatorId: string;
  transactionStatus: 'cleared' | 'refunded' | 'disputed' | 'fraudulent' | 'prohibited';
  at: Date;
}): { owed: boolean; toCreatorId: string | null; reason?: string } {
  if (input.transactionStatus !== 'cleared') {
    return { owed: false, toCreatorId: null, reason: `Transaction is ${input.transactionStatus}` };
  }
  if (!isAttributionActive(input.attribution, input.at)) {
    return { owed: false, toCreatorId: null, reason: 'No active Home Creator attribution' };
  }
  const home = input.attribution!.homeCreatorId;
  if (home === input.sellingCreatorId) {
    return { owed: false, toCreatorId: null, reason: 'Self-referral — creator earns her full share instead' };
  }
  return { owed: true, toCreatorId: home };
}

/**
 * §14: "No cross-creator recommendations are shown during, or within 30
 * minutes after, a session with the Home Creator."
 */
export function canShowFriendRecommendations(input: {
  attribution: HomeAttribution | null;
  viewingCreatorIsHome: boolean;
  inActiveSessionWithHome: boolean;
  lastHomeSessionEndedAt: Date | null;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();
  if (!isAttributionActive(input.attribution, now)) return true; // No home creator to protect.
  if (input.inActiveSessionWithHome) return false;
  if (input.lastHomeSessionEndedAt) {
    const minutesSince = (now.getTime() - input.lastHomeSessionEndedAt.getTime()) / 60000;
    if (minutesSince < REFERRAL.noPoachCooldownMinutes) return false;
  }
  return true;
}

/** A creator curates up to 5 recommendations (§8, FR-014). */
export function validateFriendsList(friendIds: string[], selfId: string): void {
  if (friendIds.length > REFERRAL.maxFriends) {
    throw new RangeError(`A Friends list holds at most ${REFERRAL.maxFriends} creators`);
  }
  if (friendIds.includes(selfId)) throw new Error('A creator cannot recommend herself');
  if (new Set(friendIds).size !== friendIds.length) throw new Error('Friends list contains duplicates');
}
