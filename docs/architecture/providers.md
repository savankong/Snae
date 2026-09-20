# Provider integration map

Every external dependency sits behind an adapter so that a provider swap is a
module change rather than a refactor. This matters more than usual here: §5 of
the spec keeps a SFW brand on the same stack as a live option, and §3.7 parks
"Verified Live" licensing, both of which need the Presence service to stay
cleanly separated.

None of these are wired up yet. This is the map of where they attach.

## Payments — `packages/money`

**Do not assume Stripe support.** The spec is explicit: this category needs an
adult-capable processor (Segpay/CCBill class), and processor approval for the
exact business model is a launch gate.

| Boundary | What it does | Notes |
|---|---|---|
| Checkout | Creates a hosted top-up session | Snae never sees card data (§A.4). Idempotency key required (§15.3). |
| Top-up webhook | Confirms funds, writes `allocateTopUp()` entries | Signature verified, event IDs deduplicated |
| Dispute webhook | Triggers evidence packet assembly | Must be idempotent — packets are keyed by transaction |
| Payout | Weekly today, next-day at P1 | Run through the processor or a licensed payout partner (§16) |

The internal ledger and the processor's records stay separate. The processor
says what happened externally; the ledger decides how value is allocated
internally.

## Identity, age and liveness — `packages/presence`

Persona-class provider for government ID, selfie liveness and face match.
Voice biometrics at P1.

The hard constraint: **templates are held by the provider, never by Snae.**
`packages/presence` accepts and returns verdicts and opaque references only —
no images, no audio buffers, no biometric templates. Anything that would change
that needs a BIPA review first (§16), not a code review.

| Boundary | What it does |
|---|---|
| Enrolment | Creator ID + selfie at onboarding, after written biometric consent |
| Live Hello check | Liveness + match against enrolment, per session |
| Re-check | Lightweight liveness during text sessions |
| Presence webhook | Signed, idempotent result delivery |

Retention and destruction schedules are published and enforced per
`biometric_consents.retention_until`.

## Voice — WebRTC

Managed provider behind a `VoiceGateway`.

**Metering comes from provider events, never client timers** (§A.2). The
running cost shown during a call is a display; `meterVoice()` reconciles
against server-observed timestamps on settlement, and the pause intervals it
subtracts come from the re-check engine, not the browser.

## Realtime text

WebSocket service or managed provider behind a `ConversationGateway`.
Conversation membership is always server-authoritative; tokens are short-lived
and scoped to the authenticated user.

## Queue and jobs

Redis-backed (BullMQ class) for webhooks, notifications, re-check scheduling,
settlement and availability expiry. Every job must be safe to retry.

Availability expiry matters more than it looks: it is what stops a creator
appearing live after she has put her phone down, which is the failure mode the
whole discovery design is built to avoid.

## Object storage

S3-compatible, private by default, short-lived signed URLs. Live Hello clips
are retained only as long as the claim and dispute windows require, then
destroyed. Metadata is stripped from everything before storage (FR-027).
