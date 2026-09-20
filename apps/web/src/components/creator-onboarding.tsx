'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, Note, cx } from './primitives';
import { ShieldTick } from './presence';

/**
 * Creator onboarding (§12.2).
 *
 * The step order is not arbitrary — it follows §14's gate: a creator cannot be
 * listed until verification is approved, biometric consent is given, and her
 * profile is published. So consent is collected *before* the ID scan that
 * needs it, and profile setup comes last, after she knows she is eligible.
 *
 * The consent step is written to satisfy BIPA and its siblings (§16): it names
 * what is collected, who holds it, how long it is kept, and how to withdraw —
 * in plain language, with an explicit affirmative tick. It is deliberately not
 * a pre-checked box or a link to a policy.
 */

type StepId = 'agreement' | 'consent' | 'identity' | 'device' | 'profile' | 'review';

const STEPS: Array<{ id: StepId; title: string; blurb: string }> = [
  { id: 'agreement', title: 'The rules', blurb: 'What you are agreeing to' },
  { id: 'consent', title: 'Biometric consent', blurb: 'Required before we can verify you' },
  { id: 'identity', title: 'Verify your ID', blurb: 'Government ID and a live selfie' },
  { id: 'device', title: 'Lock your account', blurb: 'Passkey and device binding' },
  { id: 'profile', title: 'Your profile', blurb: 'Rates, nights, and who you take' },
  { id: 'review', title: 'Review', blurb: 'We check and approve' },
];

export function CreatorOnboarding() {
  const [stepIndex, setStepIndex] = useState(0);
  const [agreed, setAgreed] = useState<Set<string>>(new Set());
  const [consented, setConsented] = useState(false);

  const step = STEPS[stepIndex]!;
  const next = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  const canAdvance =
    step.id === 'agreement' ? agreed.size === AGREEMENT_TERMS.length :
    step.id === 'consent' ? consented : true;

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      {/* ── Progress ──────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-[12px] text-ink-3">
          <span>Step {stepIndex + 1} of {STEPS.length}</span>
          <span>{step.blurb}</span>
        </div>
        <div className="mt-2.5 flex gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s.id}
                 className={cx(
                   'h-1 flex-1 rounded-full transition-all duration-500',
                   i < stepIndex ? 'bg-money' : i === stepIndex ? 'bg-live' : 'bg-raised-2',
                 )} />
          ))}
        </div>
      </div>

      <div key={step.id} className="animate-rise">
        <h1 className="font-display text-[27px] font-bold tracking-tight">{step.title}</h1>

        {step.id === 'agreement' && (
          <>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
              Snae only works if every session is genuinely you. These are the terms that make that true, and
              the ones we enforce hardest.
            </p>
            <div className="mt-6 space-y-2.5">
              {AGREEMENT_TERMS.map((t) => {
                const on = agreed.has(t.id);
                return (
                  <label key={t.id}
                         className={cx(
                           'press flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors',
                           on ? 'border-money/45 bg-money-dim/30' : 'border-hairline hover:border-ink-3',
                         )}>
                    <input type="checkbox" checked={on} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-money)]"
                           onChange={() => setAgreed((prev) => {
                             const n = new Set(prev);
                             if (n.has(t.id)) n.delete(t.id); else n.add(t.id);
                             return n;
                           })} />
                    <span>
                      <span className="block text-[14px] font-medium">{t.title}</span>
                      <span className="mt-1 block text-[13px] leading-relaxed text-ink-2">{t.body}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <Note>
              Read the full{' '}
              <Link href="/legal/creator-agreement" className="text-ink-2 underline underline-offset-4">creator agreement</Link>.
              Breaking the personal-presence rule means clawback of affected payouts and suspension.
            </Note>
          </>
        )}

        {step.id === 'consent' && (
          <>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
              To prove you are the one working each session, we need to check your face — and later your voice
              — against the ID you verify with. The law requires us to be exact about this, and we would want
              to be anyway.
            </p>

            <Card className="mt-6 p-5">
              <h2 className="font-display text-[16px] font-semibold tracking-tight">What you are consenting to</h2>
              <dl className="mt-4 space-y-3.5 text-[13.5px]">
                {CONSENT_FACTS.map((f) => (
                  <div key={f.term}>
                    <dt className="font-medium text-ink">{f.term}</dt>
                    <dd className="mt-0.5 leading-relaxed text-ink-2">{f.detail}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            <label className={cx(
              'press mt-4 flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors',
              consented ? 'border-money/45 bg-money-dim/30' : 'border-hairline hover:border-ink-3',
            )}>
              <input type="checkbox" checked={consented} onChange={() => setConsented((v) => !v)}
                     className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-money)]" />
              <span className="text-[14px] leading-relaxed">
                I have read the above and give my written consent to the collection, storage and use of my
                face and voice data as described. I understand I can withdraw it at any time, which closes my
                creator account.
              </span>
            </label>

            <Note>
              Withdrawing consent means we can no longer prove your presence, so you can no longer take paid
              sessions. Your earnings are unaffected and are paid out normally.
            </Note>
          </>
        )}

        {step.id === 'identity' && (
          <>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
              Two captures, about a minute. Our verification provider handles both — the images go to them,
              not to us.
            </p>

            <div className="mt-6 space-y-3">
              <CaptureCard
                n={1}
                title="Government ID"
                body="Driver's licence, passport or state ID. Make sure the whole card is in frame, flat, and readable."
                good={['All four corners visible', 'No glare on the photo', 'Sharp and in focus']}
              />
              <CaptureCard
                n={2}
                title="A live selfie"
                body="A short liveness capture, taken in the app. This is what your Live Hellos get matched against later."
                good={['Good, even light', 'Nothing covering your face', 'No sunglasses or hat brim']}
              />
            </div>

            <Card className="mt-4 p-4">
              <div className="flex items-start gap-2.5">
                <ShieldTick className="mt-0.5 h-4 w-4 shrink-0 text-verified-soft" />
                <Note>
                  Snae never receives or stores your ID image. The provider holds it and returns only a
                  yes-or-no answer plus a reference number.
                </Note>
              </div>
            </Card>
          </>
        )}

        {step.id === 'device' && (
          <>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
              Your account is yours alone — no team logins, no shared passwords, no automation. We bind it to
              this device with a passkey so nobody else can sign in, even if they have your password.
            </p>

            <Card className="mt-6 p-5">
              <button className="press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-verified text-[14.5px] font-semibold text-white">
                <ShieldTick className="h-4 w-4" /> Create your passkey
              </button>
              <Note>
                Face ID, Touch ID, or your device PIN. Signing in on a new device later needs a fresh presence
                check — that is deliberate.
              </Note>
            </Card>

            <Card className="mt-3 p-5">
              <h2 className="text-[14px] font-medium">Your session limits</h2>
              <Note>
                One voice call, or three text conversations, at a time. This is not a setting — it is what
                makes &ldquo;no chatter teams&rdquo; true rather than merely promised.
              </Note>
            </Card>
          </>
        )}

        {step.id === 'profile' && (
          <>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
              Set your rates, the nights you usually work, and who you are willing to take. You can change all
              of it later.
            </p>
            <Card className="mt-6 p-5">
              <div className="space-y-4">
                <Field label="Display name" placeholder="What buyers see" />
                <Field label="Your line" placeholder="One sentence. What talking to you is actually like." />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Voice, per minute" placeholder="$4.50" />
                  <Field label="Text, per message" placeholder="$1.50" />
                </div>
              </div>
              <Note>
                Rates sit within platform floors and ceilings. The floor protects everyone from a race to the
                bottom — we compete on being real, not on being cheap.
              </Note>
            </Card>
          </>
        )}

        {step.id === 'review' && (
          <div className="py-4 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-verified-dim text-verified-soft">
              <ShieldTick className="h-8 w-8" />
            </span>
            <h2 className="mt-5 font-display text-[21px] font-bold tracking-tight">That&rsquo;s everything</h2>
            <p className="mx-auto mt-3 max-w-sm text-[14.5px] leading-relaxed text-ink-2">
              We review profiles by hand — usually within a day. Once you are approved you get your own link,
              and you can go live whenever you want.
            </p>
            <Card className="mt-6 p-5 text-left">
              <h3 className="text-[14px] font-medium">While you wait</h3>
              <Note>
                Have a look at Prime Time. Creators who commit to evening hours in the first eight weeks get a
                guaranteed hourly floor — we top up the difference if it is quiet.
              </Note>
            </Card>
          </div>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────────────── */}
      <div className="mt-8 flex gap-2.5">
        {stepIndex > 0 && (
          <button onClick={back} className="press h-12 flex-1 rounded-full border border-hairline text-[14px] font-medium">
            Back
          </button>
        )}
        {stepIndex < STEPS.length - 1 ? (
          <button onClick={next} disabled={!canAdvance}
                  className={cx(
                    'press h-12 flex-[2] rounded-full text-[14.5px] font-semibold transition-colors',
                    canAdvance ? 'bg-live text-white' : 'bg-raised-2 text-ink-3',
                  )}>
            Continue
          </button>
        ) : (
          <Link href="/creator/studio"
                className="press flex h-12 flex-[2] items-center justify-center rounded-full bg-money text-[14.5px] font-semibold text-ground">
            Go to your studio
          </Link>
        )}
      </div>
    </div>
  );
}

const AGREEMENT_TERMS = [
  {
    id: 'personal',
    title: 'Every session is you, personally',
    body: 'No chatters, no assistants, no agency, no AI drafting or sending your replies. This is the one rule the whole platform is built on.',
  },
  {
    id: 'no_delegation',
    title: 'You never share your login',
    body: 'One account, one person. No team seats, no API access, no automation. A new device needs a fresh presence check.',
  },
  {
    id: 'presence',
    title: 'You will pass presence checks',
    body: 'A short live greeting at the start of every session, and quiet re-checks during text sessions. Failed checks pause billing and can refund the buyer.',
  },
  {
    id: 'conduct',
    title: 'No meeting up, no off-platform payment',
    body: 'Arranging in-person meetings or payment outside Snae is prohibited and moderated. This protects you and keeps us legal.',
  },
  {
    id: 'clawback',
    title: 'Violations mean clawback',
    body: 'If a guarantee claim is upheld against you, the buyer is refunded and the payout is recovered from future earnings.',
  },
];

const CONSENT_FACTS = [
  { term: 'What we collect', detail: 'A face template from your ID verification and your live captures. At a later stage, a voice template if you enable voice matching.' },
  { term: 'Who holds it', detail: 'Our verification provider, not Snae. We store only their yes-or-no result and a reference number. We never hold the raw template.' },
  { term: 'What it is used for', detail: 'Confirming that the person in each session is you. Nothing else. It is never used for advertising, never sold, and never shared with other platforms.' },
  { term: 'How long it is kept', detail: 'For as long as your creator account is open, then destroyed on our published retention schedule. Live Hello clips are kept only as long as claim and dispute windows require.' },
  { term: 'How to withdraw', detail: 'Any time, from your studio settings. We destroy the templates and close your creator account. Money you have already earned is paid out as normal.' },
];

function CaptureCard({ n, title, body, good }: { n: number; title: string; body: string; good: string[] }) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-raised-2 font-display text-[13px] font-bold">
          {n}
        </span>
        <div className="flex-1">
          <h3 className="font-display text-[15.5px] font-semibold tracking-tight">{title}</h3>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{body}</p>
          <ul className="mt-3 space-y-1.5">
            {good.map((g) => (
              <li key={g} className="flex items-center gap-2 text-[12.5px] text-ink-3">
                <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-money-dim text-money">
                  <CheckIcon />
                </span>
                {g}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, '-');
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</label>
      <input id={id} placeholder={placeholder}
             className="h-11 w-full rounded-xl border border-hairline bg-ground px-3.5 text-[14px] placeholder:text-ink-3 focus:border-verified/40 focus:outline-none" />
    </div>
  );
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3.5" aria-hidden="true"><path d="m5 13 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
