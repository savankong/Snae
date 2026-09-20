import Link from 'next/link';
import { formatUsd } from '@snae/money';
import { TIER_LABEL } from '@snae/standing';
import { DEMO_BUYER } from '@/lib/fixtures';
import { Card, Note, SectionHeading } from '@/components/primitives';
import { ShieldTick } from '@/components/presence';

export const metadata = { title: 'Your account', robots: { index: false, follow: false } };

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-[30px] font-bold tracking-tight">Your account</h1>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <AccountLink href="/wallet" title="Wallet" value={formatUsd(DEMO_BUYER.walletBalanceMinor)} sub="Top up, statement, refunds" />
        <AccountLink href="/account/standing" title="Standing" value={TIER_LABEL[DEMO_BUYER.tier]} sub="Your tier, badges, and appeals" />
        <AccountLink href="/favorites" title="Favourites" value={`${DEMO_BUYER.favoriteSlugs.length}`} sub="Alerts when they go live" />
        <AccountLink href="/support" title="Support" value="Contact" sub="Report a problem, get help" />
      </div>

      <section className="mt-9">
        <SectionHeading>Privacy</SectionHeading>
        <Card className="p-5">
          <ul className="space-y-3 text-[14px] text-ink-2">
            <li className="flex items-start gap-2.5">
              <ShieldTick className="mt-0.5 h-4 w-4 shrink-0 text-verified-soft" />
              Billing appears discreetly on your statement as &ldquo;SNAE DIGITAL&rdquo;.
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldTick className="mt-0.5 h-4 w-4 shrink-0 text-verified-soft" />
              Creators never see your spending, your other conversations, or notes written by anyone else.
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldTick className="mt-0.5 h-4 w-4 shrink-0 text-verified-soft" />
              Messages are retained for a limited period, then deleted on a published schedule.
            </li>
          </ul>
          <Note>
            You can download or delete your data at any time. Deletion removes your profile and messages;
            we keep the minimum records that payment and legal rules require.
          </Note>
        </Card>
      </section>

      <section className="mt-8 mb-4">
        <SectionHeading>Age verification</SectionHeading>
        <Card className="flex items-center gap-3.5 p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-money-dim text-money">
            <ShieldTick className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <div className="text-[14px] font-medium">Verified adult</div>
            <Note>Required to transact. Re-verification may be requested depending on your state.</Note>
          </div>
        </Card>
      </section>
    </div>
  );
}

function AccountLink({ href, title, value, sub }: { href: string; title: string; value: string; sub: string }) {
  return (
    <Link href={href} className="press rounded-[20px] border border-hairline bg-surface p-5 transition-colors hover:border-ink-3">
      <div className="text-[11.5px] uppercase tracking-[0.09em] text-ink-3">{title}</div>
      <div className="mt-1.5 font-display text-[22px] font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-[12.5px] text-ink-3">{sub}</div>
    </Link>
  );
}
