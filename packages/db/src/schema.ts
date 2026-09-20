import {
  pgTable, uuid, text, integer, boolean, timestamp, jsonb, pgEnum, uniqueIndex, index, primaryKey,
} from 'drizzle-orm/pg-core';

/**
 * Snae schema — §15.1 additions over the §A.1 base model.
 *
 * Constraints from §A.1 that this file holds to throughout:
 *   • UUID identifiers; sequential database ids are never exposed.
 *   • timestamptz in UTC everywhere; rendering in a locale is the UI's job.
 *   • Money is `integer` minor units. There is no numeric/decimal column here.
 *   • ledger_entries is append-only — no updatedAt, and corrections are new rows.
 *   • Raw government IDs and biometric templates stay with the provider; this
 *     schema stores verdicts and opaque references only.
 */

export const userRole = pgEnum('user_role', ['buyer', 'creator', 'moderator', 'finance', 'admin']);
export const userStatus = pgEnum('user_status', ['active', 'suspended', 'banned', 'deleted']);
export const verificationStatus = pgEnum('verification_status', ['unstarted', 'pending', 'approved', 'rejected']);
export const profileStatus = pgEnum('profile_status', ['draft', 'in_review', 'published', 'hidden']);
export const availabilityStatus = pgEnum('availability_status', ['live', 'in_session', 'booking_only', 'offline']);
export const modality = pgEnum('modality', ['voice', 'text', 'async', 'video']);
export const sessionStatus = pgEnum('session_status', [
  'requested', 'accepted', 'awaiting_live_hello', 'active', 'paused', 'completed', 'cancelled', 'refunded',
]);
export const presenceCheckType = pgEnum('presence_check_type', ['live_hello', 'recheck', 'device']);
export const presenceResult = pgEnum('presence_result', ['pending', 'pass', 'fail', 'error']);
export const ledgerAccount = pgEnum('ledger_account', [
  'creator_earnings', 'platform_revenue', 'referral_payable', 'processor_fees', 'reserve_hold', 'buyer_wallet', 'refund_dispute',
]);
export const entryType = pgEnum('entry_type', [
  'session_draw', 'topup', 'refund', 'guarantee_refund', 'commission', 'clawback', 'reserve', 'reserve_release', 'fee',
]);
export const buyerTier = pgEnum('buyer_tier', ['new', 'good', 'trusted', 'top']);
export const claimStatus = pgEnum('claim_status', ['open', 'auto_refunded', 'auto_rejected', 'under_review', 'upheld', 'rejected']);
export const caseStatus = pgEnum('case_status', ['open', 'in_review', 'resolved', 'dismissed']);

const id = () => uuid('id').primaryKey().defaultRandom();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

// ── Identity ──────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: id(),
  role: userRole('role').notNull(),
  email: text('email').notNull(),
  status: userStatus('status').notNull().default('active'),
  createdAt: createdAt(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
}, (t) => [uniqueIndex('users_email_uq').on(t.email)]);

export const buyerProfiles = pgTable('buyer_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id),
  displayName: text('display_name').notNull(),
  ageGateStatus: verificationStatus('age_gate_status').notNull().default('unstarted'),
  guaranteeEligible: boolean('guarantee_eligible').notNull().default(true),
  createdAt: createdAt(),
});

export const creatorProfiles = pgTable('creator_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id),
  slug: text('slug').notNull(),
  displayName: text('display_name').notNull(),
  bio: text('bio'),
  verificationStatus: verificationStatus('verification_status').notNull().default('unstarted'),
  profileStatus: profileStatus('profile_status').notNull().default('draft'),
  foundingCreator: boolean('founding_creator').notNull().default(false),
  /** Denormalised for card rendering; recomputed from presence_checks, never authoritative. */
  sessionsVerifiedPct: integer('sessions_verified_pct').notNull().default(0),
  medianResponseSeconds: integer('median_response_seconds'),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('creator_slug_uq').on(t.slug)]);

/**
 * §14: a creator cannot be listed until verification_status = approved,
 * biometric_consent = given, and profile_status = published. The consent row's
 * existence (and null withdrawnAt) is the second of those three gates.
 */
export const biometricConsents = pgTable('biometric_consents', {
  id: id(),
  creatorId: uuid('creator_id').notNull().references(() => creatorProfiles.userId),
  consentVersion: text('consent_version').notNull(),
  consentedAt: timestamp('consented_at', { withTimezone: true }).notNull(),
  /** Published destruction schedule — a BIPA requirement (§16). */
  retentionUntil: timestamp('retention_until', { withTimezone: true }).notNull(),
  withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
});

export const creatorDevices = pgTable('creator_devices', {
  id: id(),
  creatorId: uuid('creator_id').notNull().references(() => creatorProfiles.userId),
  passkeyRef: text('passkey_ref').notNull(),
  deviceFingerprintHash: text('device_fingerprint_hash').notNull(),
  boundAt: timestamp('bound_at', { withTimezone: true }).notNull().defaultNow(),
  lastPresenceCheckAt: timestamp('last_presence_check_at', { withTimezone: true }),
  status: text('status').notNull().default('active'),
}, (t) => [index('creator_devices_creator_idx').on(t.creatorId)]);

export const verificationCases = pgTable('verification_cases', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => users.id),
  provider: text('provider').notNull(),
  /** Opaque provider reference. The ID image itself never reaches Snae (§A.1). */
  providerRef: text('provider_ref').notNull(),
  status: verificationStatus('status').notNull().default('pending'),
  ageVerified: boolean('age_verified').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: createdAt(),
});

// ── Supply ────────────────────────────────────────────────────────────────

export const availability = pgTable('availability', {
  creatorId: uuid('creator_id').primaryKey().references(() => creatorProfiles.userId),
  status: availabilityStatus('status').notNull().default('offline'),
  textEnabled: boolean('text_enabled').notNull().default(true),
  voiceEnabled: boolean('voice_enabled').notNull().default(true),
  videoEnabled: boolean('video_enabled').notNull().default(false),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  /** Availability expires so nobody is shown live after walking away (FR-002). */
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});

export const offers = pgTable('offers', {
  id: id(),
  creatorId: uuid('creator_id').notNull().references(() => creatorProfiles.userId),
  modality: modality('modality').notNull(),
  pricingType: text('pricing_type').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  durationSeconds: integer('duration_seconds'),
  active: boolean('active').notNull().default(true),
}, (t) => [index('offers_creator_idx').on(t.creatorId)]);

export const creatorFriends = pgTable('creator_friends', {
  creatorId: uuid('creator_id').notNull().references(() => creatorProfiles.userId),
  friendCreatorId: uuid('friend_creator_id').notNull().references(() => creatorProfiles.userId),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.creatorId, t.friendCreatorId] })]);

export const creatorFilters = pgTable('creator_filters', {
  creatorId: uuid('creator_id').primaryKey().references(() => creatorProfiles.userId),
  minBuyerTier: buyerTier('min_buyer_tier').notNull().default('new'),
  newBuyerMinimumMinor: integer('new_buyer_minimum_minor').notNull().default(0),
  autoDeclineRecentDisputes: boolean('auto_decline_recent_disputes').notNull().default(true),
});

/** Region blocking enforced server-side from billing and network signals (FR-025). */
export const regionBlocks = pgTable('region_blocks', {
  id: id(),
  creatorId: uuid('creator_id').notNull().references(() => creatorProfiles.userId),
  scope: text('scope').notNull(), // 'state' | 'metro' | 'radius'
  value: text('value').notNull(),
  radiusKm: integer('radius_km'),
  createdAt: createdAt(),
}, (t) => [index('region_blocks_creator_idx').on(t.creatorId)]);

// ── Presence ──────────────────────────────────────────────────────────────

export const presenceChecks = pgTable('presence_checks', {
  id: id(),
  sessionId: uuid('session_id'),
  creatorId: uuid('creator_id').notNull().references(() => creatorProfiles.userId),
  type: presenceCheckType('type').notNull(),
  providerRef: text('provider_ref'),
  result: presenceResult('result').notNull().default('pending'),
  /** Behavioural and device signals only — never a biometric. */
  riskSignalsJson: jsonb('risk_signals_json').notNull().default({}),
  createdAt: createdAt(),
}, (t) => [
  index('presence_checks_session_idx').on(t.sessionId),
  index('presence_checks_creator_idx').on(t.creatorId, t.createdAt),
]);

// ── Sessions ──────────────────────────────────────────────────────────────

export const sessions = pgTable('sessions', {
  id: id(),
  buyerId: uuid('buyer_id').notNull().references(() => users.id),
  creatorId: uuid('creator_id').notNull().references(() => creatorProfiles.userId),
  modality: modality('modality').notNull(),
  status: sessionStatus('status').notNull().default('requested'),
  offerId: uuid('offer_id').references(() => offers.id),
  liveHelloCheckId: uuid('live_hello_check_id').references(() => presenceChecks.id),
  /** Set only once the Live Hello passes — §14 gate made structural. */
  startedBillingAt: timestamp('started_billing_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  meteredUnits: integer('metered_units').notNull().default(0),
  grossMinor: integer('gross_minor').notNull().default(0),
  createdAt: createdAt(),
}, (t) => [
  index('sessions_buyer_idx').on(t.buyerId, t.createdAt),
  index('sessions_creator_idx').on(t.creatorId, t.createdAt),
]);

export const messages = pgTable('messages', {
  id: id(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id),
  senderId: uuid('sender_id').notNull().references(() => users.id),
  type: text('type').notNull().default('text'),
  /** Encrypted at rest; never logged (§A.4). */
  bodyEncrypted: text('body_encrypted'),
  mediaRef: text('media_ref'),
  billable: boolean('billable').notNull().default(false),
  createdAt: createdAt(),
}, (t) => [index('messages_session_idx').on(t.sessionId, t.createdAt)]);

export const queueEntries = pgTable('queue_entries', {
  id: id(),
  buyerId: uuid('buyer_id').notNull().references(() => users.id),
  creatorId: uuid('creator_id').notNull().references(() => creatorProfiles.userId),
  heldMinor: integer('held_minor').notNull().default(0),
  priority: integer('priority').notNull().default(0),
  joinedAt: createdAt(),
}, (t) => [uniqueIndex('queue_buyer_creator_uq').on(t.buyerId, t.creatorId)]);

export const schedules = pgTable('schedules', {
  id: id(),
  buyerId: uuid('buyer_id').notNull().references(() => users.id),
  creatorId: uuid('creator_id').notNull().references(() => creatorProfiles.userId),
  modality: modality('modality').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  priceMinor: integer('price_minor').notNull(),
  status: text('status').notNull().default('booked'),
  createdAt: createdAt(),
}, (t) => [index('schedules_creator_idx').on(t.creatorId, t.startsAt)]);

// ── Money ─────────────────────────────────────────────────────────────────

export const wallets = pgTable('wallets', {
  buyerId: uuid('buyer_id').primaryKey().references(() => users.id),
  /** A cache of the ledger, refreshed on write. The ledger remains the truth. */
  balanceMinor: integer('balance_minor').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: id(),
  buyerId: uuid('buyer_id').notNull().references(() => users.id),
  creatorId: uuid('creator_id').references(() => creatorProfiles.userId),
  sessionId: uuid('session_id').references(() => sessions.id),
  grossMinor: integer('gross_minor').notNull(),
  currency: text('currency').notNull().default('USD'),
  status: text('status').notNull().default('pending'),
  processorRef: text('processor_ref'),
  /** Idempotency key on checkout and session creation (§15.3). */
  idempotencyKey: text('idempotency_key'),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('transactions_idem_uq').on(t.idempotencyKey)]);

/**
 * APPEND-ONLY (§14, §A.3). There is intentionally no updatedAt and no
 * deletedAt on this table. A mistake is corrected with a compensating entry.
 */
export const ledgerEntries = pgTable('ledger_entries', {
  id: id(),
  transactionId: uuid('transaction_id').references(() => transactions.id),
  accountType: ledgerAccount('account_type').notNull(),
  accountId: uuid('account_id'),
  amountMinor: integer('amount_minor').notNull(),
  entryType: entryType('entry_type').notNull(),
  availableAt: timestamp('available_at', { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [
  index('ledger_account_idx').on(t.accountType, t.accountId),
  index('ledger_txn_idx').on(t.transactionId),
]);

export const payoutProfiles = pgTable('payout_profiles', {
  creatorId: uuid('creator_id').primaryKey().references(() => creatorProfiles.userId),
  payoutSpeed: text('payout_speed').notNull().default('weekly'),
  reservePct: integer('reserve_pct').notNull().default(10),
  earlyPayoutCapPct: integer('early_payout_cap_pct').notNull().default(0),
  eligibilityState: text('eligibility_state').notNull().default('standard'),
});

// ── Trust, guarantee, and disputes ────────────────────────────────────────

export const guaranteeClaims = pgTable('guarantee_claims', {
  id: id(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id),
  buyerId: uuid('buyer_id').notNull().references(() => users.id),
  status: claimStatus('status').notNull().default('open'),
  autoResolved: boolean('auto_resolved').notNull().default(false),
  evidenceRefs: jsonb('evidence_refs').notNull().default([]),
  resolution: text('resolution'),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index('claims_status_idx').on(t.status, t.createdAt)]);

/** Assembled automatically and idempotently on a processor dispute (§3.1, FR-022). */
export const disputePackets = pgTable('dispute_packets', {
  id: id(),
  transactionId: uuid('transaction_id').notNull().references(() => transactions.id),
  sessionId: uuid('session_id').references(() => sessions.id),
  evidenceRefs: jsonb('evidence_refs').notNull().default([]),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  processorCaseRef: text('processor_case_ref'),
  outcome: text('outcome'),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('dispute_packet_txn_uq').on(t.transactionId)]);

export const buyerStanding = pgTable('buyer_standing', {
  buyerId: uuid('buyer_id').primaryKey().references(() => users.id),
  tier: buyerTier('tier').notNull().default('new'),
  badges: jsonb('badges').notNull().default([]),
  reasons: jsonb('reasons').notNull().default([]),
  computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
  modelVersion: text('model_version').notNull(),
});

/** Structured ratings only. §14: free-text notes are never shared between creators. */
export const buyerRatings = pgTable('buyer_ratings', {
  id: id(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id),
  buyerId: uuid('buyer_id').notNull().references(() => users.id),
  creatorId: uuid('creator_id').notNull().references(() => creatorProfiles.userId),
  respectful: boolean('respectful').notNull(),
  paidAsAgreed: boolean('paid_as_agreed').notNull(),
  followedRules: boolean('followed_rules').notNull(),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('buyer_rating_session_uq').on(t.sessionId)]);

export const standingAppeals = pgTable('standing_appeals', {
  id: id(),
  buyerId: uuid('buyer_id').notNull().references(() => users.id),
  reason: text('reason').notNull(),
  status: caseStatus('status').notNull().default('open'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: createdAt(),
});

/** Bans follow the person across new accounts via hashed signals (FR-026). */
export const personBans = pgTable('person_bans', {
  id: id(),
  scope: text('scope').notNull(), // 'creator' | 'platform'
  creatorId: uuid('creator_id').references(() => creatorProfiles.userId),
  hashedPaymentSignal: text('hashed_payment_signal'),
  hashedDeviceSignal: text('hashed_device_signal'),
  hashedVerificationSignal: text('hashed_verification_signal'),
  createdBy: uuid('created_by').references(() => users.id),
  reason: text('reason').notNull(),
  createdAt: createdAt(),
}, (t) => [
  index('person_bans_payment_idx').on(t.hashedPaymentSignal),
  index('person_bans_device_idx').on(t.hashedDeviceSignal),
]);

export const safetyCases = pgTable('safety_cases', {
  id: id(),
  creatorId: uuid('creator_id').notNull().references(() => creatorProfiles.userId),
  category: text('category').notNull(),
  details: text('details').notNull(),
  status: caseStatus('status').notNull().default('open'),
  /** Coercion and threat reports jump the queue (§3.4). */
  prioritized: boolean('prioritized').notNull().default(true),
  createdAt: createdAt(),
});

// ── Growth and marketplace loop ───────────────────────────────────────────

export const homeAttributions = pgTable('home_attributions', {
  buyerId: uuid('buyer_id').primaryKey().references(() => users.id),
  homeCreatorId: uuid('home_creator_id').notNull().references(() => creatorProfiles.userId),
  source: text('source').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const referralCommissions = pgTable('referral_commissions', {
  id: id(),
  transactionId: uuid('transaction_id').notNull().references(() => transactions.id),
  referringCreatorId: uuid('referring_creator_id').notNull().references(() => creatorProfiles.userId),
  amountMinor: integer('amount_minor').notNull(),
  status: text('status').notNull().default('pending'),
  availableAt: timestamp('available_at', { withTimezone: true }),
  createdAt: createdAt(),
});

export const favorites = pgTable('favorites', {
  buyerId: uuid('buyer_id').notNull().references(() => users.id),
  creatorId: uuid('creator_id').notNull().references(() => creatorProfiles.userId),
  /** Email alert when she goes live (FR-013). */
  alertOnLive: boolean('alert_on_live').notNull().default(true),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.buyerId, t.creatorId] })]);

/** Tracked from launch; grants are P2 (FR-032). */
export const ownershipAccruals = pgTable('ownership_accruals', {
  id: id(),
  creatorId: uuid('creator_id').notNull().references(() => creatorProfiles.userId),
  period: text('period').notNull(),
  verifiedHours: integer('verified_hours').notNull().default(0),
  sessions: integer('sessions').notNull().default(0),
  buyersBrought: integer('buyers_brought').notNull().default(0),
  unitsAccrued: integer('units_accrued').notNull().default(0),
  forfeited: boolean('forfeited').notNull().default(false),
}, (t) => [uniqueIndex('ownership_creator_period_uq').on(t.creatorId, t.period)]);

// ── Governance ────────────────────────────────────────────────────────────

export const blocks = pgTable('blocks', {
  blockerUserId: uuid('blocker_user_id').notNull().references(() => users.id),
  blockedUserId: uuid('blocked_user_id').notNull().references(() => users.id),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.blockerUserId, t.blockedUserId] })]);

export const reports = pgTable('reports', {
  id: id(),
  reporterId: uuid('reporter_id').notNull().references(() => users.id),
  subjectUserId: uuid('subject_user_id').notNull().references(() => users.id),
  sessionId: uuid('session_id').references(() => sessions.id),
  category: text('category').notNull(),
  details: text('details'),
  status: caseStatus('status').notNull().default('open'),
  createdAt: createdAt(),
});

export const moderationCases = pgTable('moderation_cases', {
  id: id(),
  objectType: text('object_type').notNull(),
  objectId: uuid('object_id').notNull(),
  reason: text('reason').notNull(),
  status: caseStatus('status').notNull().default('open'),
  reviewerId: uuid('reviewer_id').references(() => users.id),
  createdAt: createdAt(),
});

/** Every money, admin, and moderation state transition is traceable (§A.7). */
export const auditEvents = pgTable('audit_events', {
  id: id(),
  actorId: uuid('actor_id').references(() => users.id),
  action: text('action').notNull(),
  objectType: text('object_type').notNull(),
  objectId: uuid('object_id'),
  metadataJson: jsonb('metadata_json').notNull().default({}),
  /** Hashed, never raw — buyer privacy is an existential risk here (§16). */
  ipHash: text('ip_hash'),
  createdAt: createdAt(),
}, (t) => [index('audit_object_idx').on(t.objectType, t.objectId, t.createdAt)]);

export const notifications = pgTable('notifications', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  channel: text('channel').notNull().default('email'),
  payloadJson: jsonb('payload_json').notNull().default({}),
  status: text('status').notNull().default('queued'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: createdAt(),
});
