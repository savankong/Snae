# Available — V2 design ("Neon After Hours")

Four artboards for the buyer-facing surfaces of **Available**, the verified-creator
paid-conversation marketplace described in the PRD / technical build spec.
Design only — no application code yet.

| File | Screen | Size |
|---|---|---|
| `V2-Home.dc.html` | Homepage | 1440 × 1860 |
| `V2-Profile.dc.html` | Creator profile | 1440 × 1940 |
| `V2-Mobile.dc.html` | Phone: home + swipe deck | 860 × 1300 (two 390 frames) |
| `V2-States.dc.html` | Phone: empty state + alert priming | 860 × 1300 (two 390 frames) |

`canvas.json` is the canvas index: frame positions, titles and notes.

If `images/*.jpg` are missing, run `images/fetch-placeholders.sh` to rebuild them.

## The design premise

An earlier version of V2 was availability-first: a "62 LIVE" counter over a dense
twelve-card grid. That design fails the actual launch conditions — 10–25 founding
creators who work a few evenings a week around other jobs. It over-promises, and it
looks dead every time nobody is online.

So **availability is a state on a card, not the organising idea of the page.**

- **Ring tray** (Instagram-style) replaces the live counter. Pink = on now,
  violet = posted today, grey = offline with the next slot. The ring gives a reason
  to tap whether or not anyone is live.
- **Paid async messages** are the load-bearing mechanic, not a visual flourish.
  "Leave her a message — $2.50. She replies within 24 hours or you're refunded."
  With part-time supply, "Talk Now" fails most visits; async keeps the marketplace
  transacting around the clock.
- **"Her usual nights"** — a seven-day strip on the profile. Turns part-time from a
  defect into an appointment.
- **Two-stage reminders** — an hour before, and the moment she is actually on.
- **Swipe deck** (TikTok-style) on mobile. Fourteen creators read as generous as a
  deck and sparse as a grid.
- **The empty state gets its own artboard**, because it will be hit constantly early
  on. It never dead-ends: it converts to an alert, then lists who is on later tonight.

The profile is designed **offline-first**, since that is the state most visitors will
actually land on.

Compliance surfaces are carried in the design, not bolted on: 18+ strip, ID-verified
badges, dollar prices (never credits), availability expiry, favourite + alert,
report/block, Founding Creator badge, "no account needed to browse", and a footer
including 2257 and content-removal links. The homepage states outright that ranking
cannot be bought.

## Placeholder content — read before reusing

All names, prices, ratings, reviews and copy are **placeholder sample data**.

The photographs in `images/` are **placeholders that must not ship.** They come from
Unsplash and Pexels (see `images/CREDITS.md`). Both licenses carry a sensitive-use
restriction, and depicting an identifiable person as an adult-services creator is
exactly the case those clauses exist to prevent. Launch imagery has to come from your
own verified creators, under a model release covering this specific use.

Note also that this layout leans hard on portrait quality. Mixed-quality self-uploads
will look markedly worse than these comps — an argument for art-directing the first
10–25 creators.

## Continuing this work in another Claude account

These artboards are `.dc.html` files for the **Design (canvas)** Artifact type. To get
them onto a canvas in a different account:

1. Ask Claude to create an artifact from the Design type, then publish these files
   under `project/` — `canvas.json` as the index and each `.dc.html` beside it.
2. Upload `images/*.jpg` to that artifact as assets (a batch upload returns one id
   per file).
3. Run `python3 relink-images.py new-ids.json`, where `new-ids.json` maps each
   filename to its new asset id, e.g. `{"sofia.jpg": "<id>", ...}`. The script
   rewrites every `/_blob/<id>` reference in the artboards and warns about any it
   does not recognise.
4. Republish the four `.dc.html` files.

Step 3 is needed because `/_blob/<id>` asset ids belong to the artifact they were
uploaded to; a new canvas gets its own. `relink-images.py` records the current ids.

### Authoring rules that bite

Each `.dc.html` is self-contained. When editing, keep:

- the `<script src="./support.js"></script>` head line exactly as it is;
- the root element's fixed `width`/`height` equal to the board's `w`/`h` in
  `canvas.json`, and the same values in `$preview`;
- `{{hole}}` as a dotted lookup into `renderVals()` only — never an expression;
- inline `style="…"` for visual properties; `<helmet><style>` only for page basics;
- real `<button>`, `<a href>`, `<input>` + `<label>`; `aria-label` on icon-only
  buttons;
- single-quoted `data-props` JSON.

Repeated content (`<sc-for>`) and conditional chips/CTAs (`<sc-if>`) are driven from
`renderVals()` at the bottom of each file — that is where the sample creators, prices
and availability states live.

## Design tokens

Ground `#08070C` · surface `#0F0D15` · raised `#14111C` / `#1A1626`
Hot pink `#FF3D81` (live state, primary action) · violet `#7C5CFF` / `#9E86FF`
(verified, scheduled, secondary) · offline ring `#35313F`
Text `#F2F0F7` / `#A39FB5` / `#7C7894`

Display **Bricolage Grotesque** over body **Space Grotesk**, both Google Fonts,
loaded per-artboard in `<helmet>`.

## Not included

V1 ("Midnight Velvet") — the alternative editorial direction, with prepaid session
pricing instead of metered per-message — is not in this commit.
