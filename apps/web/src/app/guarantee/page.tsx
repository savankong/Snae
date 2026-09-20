import { LinkButton, Card, Note, SectionHeading } from '@/components/primitives';
import { ShieldTick } from '@/components/presence';

export const metadata = {
  title: 'The Real-Person Guarantee',
  description:
    'Every paid conversation on Snae is with the verified creator herself — proven live at the start of the session and throughout it. If it is not her, you get your money back.',
  alternates: { canonical: '/guarantee' },
};

/** Public, indexable explainer. This is the launch PR story (§10), so it is a real page. */
export default function GuaranteePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="animate-rise">
        <span className="inline-flex items-center gap-2 rounded-full border border-verified/30 bg-verified-dim px-3 py-1.5 text-[12px] font-medium text-verified-soft">
          <ShieldTick className="h-3.5 w-3.5" /> The Real-Person Guarantee
        </span>
        <h1 className="mt-5 font-display text-[38px] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[46px]">
          If it isn&rsquo;t her, you get your money back.
        </h1>
        <p className="mt-5 text-[16px] leading-relaxed text-ink-2">
          On other platforms, a large share of paid messages are written by outsourced chatter agencies,
          account managers, and increasingly AI. Those platforms verify a creator&rsquo;s identity once, at
          signup, and then say nothing about who is typing. We do the opposite.
        </p>
      </div>

      <section className="mt-12">
        <SectionHeading>How we prove it</SectionHeading>
        <div className="space-y-3">
          {MECHANISMS.map((m) => (
            <Card key={m.title} className="p-5">
              <h3 className="font-display text-[16.5px] font-semibold tracking-tight">{m.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{m.what}</p>
              <p className="mt-2.5 border-l-2 border-verified/40 pl-3 text-[13px] leading-relaxed text-verified-soft">
                {m.proves}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <SectionHeading>Filing a claim</SectionHeading>
        <Card className="p-5">
          <ol className="space-y-4">
            {[
              ['Tap "Not her?"', 'It sits in every session, and stays available for 24 hours afterwards.'],
              ['We read the presence log', 'The Live Hello result, every in-session re-check, and the device signals for that session.'],
              ['Failed or missing checks refund automatically', 'The money is back in your wallet without anyone having to argue about it.'],
              ['Anything ambiguous goes to a person', 'A moderator reviews it within our published SLA and you hear back either way.'],
            ].map(([title, body], i) => (
              <li key={title} className="flex gap-3.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-verified-dim font-display text-[12px] font-bold text-verified-soft">
                  {i + 1}
                </span>
                <div>
                  <div className="text-[14.5px] font-medium">{title}</div>
                  <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-2">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <Note>
            Claims are resolved from presence logs, not assertion alone — which protects creators from false
            claims just as much as it protects you. Limits apply per account.
          </Note>
        </Card>
      </section>

      <section id="prime-time" className="mt-12 scroll-mt-20">
        <SectionHeading>Why we open in windows</SectionHeading>
        <Card className="p-5">
          <p className="text-[14.5px] leading-relaxed text-ink-2">
            Our creators are real people with real lives, and most of them work a few evenings a week. An
            always-on &ldquo;available now&rdquo; page would be empty most of the time and would be lying to you
            the rest of it. So we concentrate into Prime Time windows — currently 7pm to 1am Eastern — and
            outside them we show you who is booking-available and when the next window opens.
          </p>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
            One person can only hold so many real conversations. That is the cost of the guarantee, and we
            would rather be honest about it than fake the inventory.
          </p>
        </Card>
      </section>

      <section className="mt-12">
        <SectionHeading>Your privacy</SectionHeading>
        <Card className="p-5">
          <ul className="space-y-2.5 text-[14px] leading-relaxed text-ink-2">
            <li>Billing appears discreetly on your statement.</li>
            <li>We keep as little about you as we can, and messages are retained only for a limited period.</li>
            <li>Creators never see what you spend, and never see notes other creators wrote about you.</li>
            <li>Live Hello clips and presence logs are kept only as long as needed to resolve claims and payment disputes, then destroyed on a published schedule.</li>
          </ul>
        </Card>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <LinkButton href="/" variant="live" size="lg">Browse creators</LinkButton>
        <LinkButton href="/creator/onboarding" variant="outline" size="lg">Apply to create</LinkButton>
      </div>
    </div>
  );
}

const MECHANISMS = [
  {
    title: 'A live hello that says your name',
    what: 'When your session starts, she records a 3–5 second greeting, live in the app, that says your display name. Camera and microphone capture only — no uploads, no photo library. You see or hear it before billing begins.',
    proves: 'She is here, now, and this is for you. It cannot be pre-recorded, because it is about you.',
  },
  {
    title: 'Matched against her government ID',
    what: 'That greeting goes to our verification provider for a liveness check and a face match against the ID she verified with when she joined.',
    proves: 'The person greeting you is the person who passed identity verification.',
  },
  {
    title: 'Quiet re-checks during text sessions',
    what: 'A two-second tap-to-confirm runs at intervals and whenever something looks off — a new device, an unusual typing rhythm, a burst of pasted text.',
    proves: 'The verified creator is still the one typing, not someone who took over mid-conversation.',
  },
  {
    title: 'One account, one person',
    what: 'No delegated logins, no team seats, no automation access. Accounts are bound to her device with a passkey, and a new device requires a fresh presence check. She can hold one voice call or three text conversations at a time — no more.',
    proves: 'The chatter-team model is structurally impossible here, not merely against the rules.',
  },
  {
    title: 'A seal you can actually read',
    what: 'Every card and conversation shows when presence was last verified. Her profile shows the share of her sessions that passed, and her median reply time.',
    proves: 'You can compare creators on the thing that matters, before you spend anything.',
  },
];
