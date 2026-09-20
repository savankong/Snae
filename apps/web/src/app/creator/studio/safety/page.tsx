import Link from 'next/link';
import { Button, Card, Note, SectionHeading } from '@/components/primitives';
import { ShieldTick } from '@/components/presence';

export const metadata = { title: 'Safety', robots: { index: false, follow: false } };

/**
 * The private safety channel (FR-028, §3.4).
 *
 * §16 names the case this is really for: coercion and trafficking signals,
 * where a creator may be being watched. So the page opens with the private
 * channel rather than burying it under settings, says plainly that reports are
 * not visible to buyers, and keeps the language direct.
 */
export default function SafetyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/creator/studio" className="text-[13px] text-ink-3 hover:text-ink">← Studio</Link>
      <h1 className="mt-3 font-display text-[30px] font-bold tracking-tight">Safety</h1>

      <Card className="mt-6 border-danger/25 p-5">
        <div className="flex items-start gap-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
            <ShieldTick className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-[17px] font-semibold tracking-tight">Talk to us privately</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
              A direct line to our trust and safety team. Nothing you send here is visible to buyers, and it
              does not appear anywhere in your public profile or your session history.
            </p>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-2">
              If someone is pressuring you, threatening you, or controlling your account — tell us. We can
              freeze payouts, lock your account, and involve the right people. You will not lose earnings for
              raising it.
            </p>
            <Button variant="danger" className="mt-4">Open a private case</Button>
          </div>
        </div>
      </Card>

      <section className="mt-8">
        <SectionHeading>What protects you already</SectionHeading>
        <div className="space-y-3">
          {PROTECTIONS.map((p) => (
            <Card key={p.title} className="p-5">
              <h3 className="font-display text-[15.5px] font-semibold tracking-tight">{p.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{p.body}</p>
              {p.status && (
                <span className="mt-2.5 inline-block rounded-full border border-hairline px-2.5 py-1 text-[11.5px] text-ink-3">
                  {p.status}
                </span>
              )}
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-8 mb-4">
        <SectionHeading>Your account security</SectionHeading>
        <Card className="divide-y divide-[var(--color-hairline)]">
          <Row title="Passkey" value="Bound to 1 device" action="Manage" />
          <Row title="Payout destination" value="Bank ending 8891" action="Change" />
          <Row title="Biometric consent" value="Given · retention schedule published" action="Withdraw" />
        </Card>
        <Note>
          Changing your payout destination triggers a review. It is a common sign of an account being
          controlled by someone else, so we check rather than assume.
        </Note>
      </section>
    </div>
  );
}

const PROTECTIONS = [
  {
    title: 'Bans follow the person, not the username',
    body: 'When you ban someone, we match the signals behind the account — payment, device, verification — so a fresh signup does not get them back to you.',
    status: 'Active',
  },
  {
    title: 'Metadata is stripped from everything',
    body: 'Location and device data is removed from your Live Hello clips and any media you share, before it is stored.',
    status: 'Active',
  },
  {
    title: 'Nobody can log in as you',
    body: 'Single-person accounts, passkey and device binding, and a fresh presence check on any new device. There is no way to hand your account to someone else, which is the point.',
    status: 'Active',
  },
  {
    title: 'Leak detection and takedowns',
    body: 'Per-buyer watermarking on shared media, monitoring for leaks, and takedown notices filed on your behalf through a specialist.',
    status: 'Coming after launch',
  },
];

function Row({ title, value, action }: { title: string; value: string; action: string }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="flex-1">
        <div className="text-[14px] font-medium">{title}</div>
        <div className="text-[12.5px] text-ink-3">{value}</div>
      </div>
      <Button variant="outline" size="sm">{action}</Button>
    </div>
  );
}
