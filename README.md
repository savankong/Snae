# Snae

Real people. Proven live. Available now.

A marketplace for paid, private, real-time conversations — voice and text — with
verified adult creators. The product's one differentiator is the **Real-Person
Guarantee**: every paid session is proven live by the verified creator herself,
or the buyer is refunded.

Built against [the v3.0 business plan, PRD and technical build spec](https://wiki.yourrosterapp.com/doc/snae-business-plan-prd-technical-build-spec-v30-ICQQSfeP9I).

## Status

Sprints 1–6 of the spec's build sequence, as a running application with the
domain rules implemented and tested. Provider integrations are not wired up:
payments, identity verification, WebRTC and realtime transport sit behind the
adapter boundaries described below, and the app currently renders from
fixtures. Everything else — the rules that decide who gets paid what, who can
start a session, and what a creator is allowed to see — is real code with tests.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 77 unit tests
npm run typecheck    # tsc --noEmit, strict
npm run build        # production build
```

Node 22 or newer. No database or provider credentials are needed to run the app
as it stands.

## Layout

```
apps/web/            Next.js 16 App Router — buyer, creator and admin surfaces
packages/
  config/            Take rates, price bounds, presence thresholds, feature flags
  money/             Integer-cent primitives, append-only ledger, session metering
  presence/          Live Hello gate, re-check scheduling, seal state, claim triage
  standing/          Buyer Standing and creator accept filters
  referrals/         Home Creator attribution and cross-creator commission
  marketplace/       Availability, Prime Time, concurrency caps, queue, ranking
  db/                Drizzle schema
design/v2/           "Neon After Hours" artboards the UI is built from
docs/                Architecture notes and the provider integration map
```

The domain packages hold every rule the spec is strict about, deliberately away
from the UI. A component cannot compute a payout, decide whether billing may
start, or widen what a creator sees about a buyer — it can only render what the
domain layer returns.

## The rules worth knowing

A few constraints shaped the code more than anything else. They are documented
at their call sites, but they are easy to break by accident:

- **Money is integer cents, everywhere.** No floats touch a balance. Ledger
  allocations must balance to zero before they can be persisted, and
  `splitByRate` guarantees the parts sum to the whole at any rate.
- **The ledger is append-only.** Corrections are compensating entries. The
  `ledger_entries` table has no `updatedAt` for this reason.
- **Nothing bills before a passing Live Hello.** `billingGate()` is the single
  gate; a failed check cancels the session at no charge.
- **Cross-creator commission comes out of the platform's share**, never the
  creator's. A creator earns exactly the same whether or not a referral is owed.
- **Creators see a buyer's tier and badges, and nothing else.** The narrowing
  happens in `creatorView()` in the domain layer, not at the template.
- **No cross-creator recommendations during, or within 30 minutes after, a
  session with the buyer's Home Creator.** Asked via
  `canShowFriendRecommendations()` rather than assumed.
- **Take rates are configurable.** `allocateSession` accepts rate overrides
  because §7.2 requires them to stay admin-configurable; it refuses a rate pair
  that would pay out more than the platform earns.
- **The presence layer holds no biometric data.** Provider verdicts and opaque
  references only. Raw captures never reach Snae.

## Design

The UI is built from the `design/v2` artboards ("Neon After Hours"), whose
premise governs the marketplace surfaces: with 10–25 part-time creators,
availability is a *state on a card*, not the organising promise of the page. So
there is no live counter, the ring tray gives a reason to tap whether or not
anyone is on, and paid async messages keep the marketplace transacting when
nobody is live. Every empty state converts to an alert, a booking or a message
rather than dead-ending.

Tokens, the motion vocabulary and the reduced-motion rules live in
`apps/web/src/styles/globals.css`. Animation is used where it carries meaning —
the presence seal pulses only when presence is genuinely fresh, and a stale seal
sits still, because a pulsing stale seal would be making a claim the data does
not support.

## Placeholder content

All creator names, prices, ratings and copy are sample data. The repo ships no
photographs at all: creator cards render a generated gradient mark, because
depicting an identifiable person as an adult-services creator is precisely what
stock-photo sensitive-use clauses prohibit. Launch imagery has to come from
verified creators under a model release covering this specific use.

## What is not built

- Provider integrations: adult-capable payment processor, identity/liveness
  provider, WebRTC voice transport, realtime text transport. See
  `docs/architecture/providers.md` for the adapter boundaries these plug into.
- Persistence. The schema is written; migrations and repositories are not.
- Auth, passkeys and device binding.
- The async job queue for webhooks, re-check scheduling and settlement.

These are Sprint 0 and Sprint 1 dependencies, most of which are blocked on
commercial decisions — processor approval, presence provider pricing, and the
legal review listed in the spec's launch gates.
